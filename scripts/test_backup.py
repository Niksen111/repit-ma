"""Run on Linux with Python 3.12+ and boto3: python3 -m unittest discover -s scripts."""
import io
import json
from pathlib import Path
import sqlite3
import tarfile
import tempfile
import unittest
from unittest.mock import patch

from botocore.response import StreamingBody
import backup


class MemoryS3:
    def __init__(self):
        self.objects = {}
        self.uploads = []
        self.corrupt = False

    def put_object(self, **request):
        assert request['ACL'] == 'private'
        key = (request['Bucket'], request['Key'])
        self.objects[key] = request['Body'].read()
        self.uploads.append(key)

    def get_object(self, **request):
        contents = self.objects[(request['Bucket'], request['Key'])]
        if self.corrupt:
            contents = b'corrupted'
        return {'Body': StreamingBody(io.BytesIO(contents), len(contents))}


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / 'data').mkdir()
        (self.root / '.env').write_text('APP_VERSION=test\n')
        with sqlite3.connect(self.root / 'data/repit-ma.db') as db:
            db.execute('CREATE TABLE sample(value TEXT)')
            db.execute("INSERT INTO sample VALUES ('restore-test')")
        self.config = {'project_dir': str(self.root), 'bucket': 'test-bucket',
            'endpoint_url': 'https://test-bucket.hb.ru-msk.vkcloud-storage.ru',
            'region': 'ru-msk', 'access_key_id': 'test', 'secret_access_key': 'test'}
        self.config_path = self.root / 'config.json'
        self.save_config()
        self.client = MemoryS3()
        self.factory = patch('boto3.client', return_value=self.client).start()
        self.addCleanup(patch.stopall)

    def save_config(self):
        self.config_path.write_text(json.dumps(self.config))

    def archives(self):
        return sorted((self.root / 'backups/weekly').glob('*.tar.gz'))

    def test_snapshot_can_restore_rows_and_normalizes_bucket_url(self):
        backup.main(str(self.config_path))
        archive = self.archives()[0]
        restored = self.root / 'restored'
        with tarfile.open(archive) as bundle:
            bundle.extractall(restored, filter='data')
        database = restored / 'data/repit-ma.db'
        with sqlite3.connect(database) as db:
            self.assertEqual(db.execute('SELECT value FROM sample').fetchone(), ('restore-test',))
        manifest = json.loads((restored / 'manifest.json').read_text())
        self.assertEqual(manifest['database_sha256'], backup.sha256(database))
        self.assertEqual(self.factory.call_args.kwargs['endpoint_url'],
                         'https://hb.ru-msk.vkcloud-storage.ru')

    def test_corrupt_download_is_not_marked_uploaded_and_is_retried(self):
        self.client.corrupt = True
        with self.assertRaisesRegex(RuntimeError, 'checksum mismatch'):
            backup.main(str(self.config_path))
        pending = self.archives()[0]
        marker = pending.with_name(pending.name + '.uploaded')
        self.assertFalse(marker.exists())
        self.client.corrupt = False
        backup.main(str(self.config_path))
        self.assertTrue(marker.exists())
        self.assertEqual(sum(key.endswith(pending.name) for _, key in self.client.uploads), 2)

    def test_changed_destination_reuploads_old_archives(self):
        backup.main(str(self.config_path))
        first = self.archives()[0]
        self.config['bucket'] = 'new-bucket'
        self.config['endpoint_url'] = 'https://hb.ru-msk.vkcloud-storage.ru'
        self.save_config()
        backup.main(str(self.config_path))
        self.assertIn(('new-bucket', 'repit-ma/weekly/' + first.name), self.client.objects)

    def test_insecure_endpoint_is_rejected(self):
        self.config['endpoint_url'] = 'http://hb.ru-msk.vkcloud-storage.ru'
        with self.assertRaises(ValueError):
            backup.S3Storage(self.config)


if __name__ == '__main__':
    unittest.main()
