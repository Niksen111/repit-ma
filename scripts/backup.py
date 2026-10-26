#!/usr/bin/env python3
"""Consistent SQLite snapshot with verified S3 upload (Python 3.12+, boto3)."""
import base64
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import tarfile
import tempfile
import time
import urllib.parse


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def check_database(path):
    with sqlite3.connect(path.as_uri() + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise RuntimeError('SQLite integrity check failed')
        if db.execute('PRAGMA foreign_key_check').fetchone() is not None:
            raise RuntimeError('SQLite foreign key check failed')


class S3Storage:
    def __init__(self, config):
        import boto3
        from botocore.config import Config

        self.bucket = config['bucket']
        endpoint = urllib.parse.urlsplit(config['endpoint_url'])
        if (endpoint.scheme != 'https' or not endpoint.hostname or
                endpoint.username or endpoint.password or endpoint.query or
                endpoint.fragment or endpoint.path not in ('', '/')):
            raise ValueError('S3 endpoint must be an HTTPS service URL without a path')
        # VK's console also displays a bucket URL; boto3 expects the service URL.
        host = endpoint.netloc
        if host.startswith(self.bucket + '.'):
            host = host[len(self.bucket) + 1:]
        self.endpoint = 'https://' + host
        self.prefix = config.get('prefix', 'repit-ma/weekly').strip('/')
        if any(p in ('.', '..') for p in self.prefix.split('/')):
            raise ValueError('Invalid S3 prefix')
        self.client = boto3.client('s3', endpoint_url=self.endpoint,
            region_name=config['region'], aws_access_key_id=config['access_key_id'],
            aws_secret_access_key=config['secret_access_key'],
            config=Config(signature_version='s3v4',
                s3={'addressing_style': 'path'}, connect_timeout=15, read_timeout=180,
                retries={'mode': 'standard', 'total_max_attempts': 4}, proxies={}))

    def key(self, path):
        return '/'.join(filter(None, (self.prefix, path.name)))

    def receipt(self, path):
        return {'endpoint': self.endpoint, 'bucket': self.bucket,
                'key': self.key(path), 'sha256': sha256(path)}

    def upload_verified(self, path):
        expected = sha256(path)
        with path.open('rb') as stream:
            md5 = base64.b64encode(hashlib.file_digest(stream, 'md5').digest()).decode()
            stream.seek(0)
            self.client.put_object(Bucket=self.bucket, Key=self.key(path), Body=stream,
                ContentLength=path.stat().st_size, ContentType='application/gzip',
                ContentMD5=md5, ACL='private', Metadata={'sha256': expected})
        print(f'S3 upload complete, verifying download: {path.name}', flush=True)
        response = self.client.get_object(Bucket=self.bucket, Key=self.key(path))
        try:
            digest = hashlib.sha256()
            for chunk in response['Body'].iter_chunks(chunk_size=1024 * 1024):
                digest.update(chunk)
        finally:
            response['Body'].close()
        if digest.hexdigest() != expected:
            raise RuntimeError('Uploaded archive checksum mismatch')


def main(config_path):
    os.umask(0o077)
    config = json.loads(Path(config_path).read_text())
    root = Path(config.get('project_dir', '/opt/repit-ma')).resolve()
    directory = root / 'backups' / 'weekly'
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Same lock as deploy.sh: a deployment cannot replace the database mid-backup.
    with (root / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        archive = directory / f'repit-ma-{stamp}.tar.gz'
        with tempfile.TemporaryDirectory(prefix='.snapshot-', dir=directory) as temporary:
            stage = Path(temporary)
            snapshot = stage / 'data' / 'repit-ma.db'
            snapshot.parent.mkdir()
            source = root / 'data' / 'repit-ma.db'
            with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True,
                                 timeout=60) as live:
                with sqlite3.connect(snapshot) as destination:
                    deadline = time.monotonic() + 300

                    def progress(status, remaining, total):
                        if time.monotonic() > deadline:
                            raise TimeoutError('SQLite snapshot exceeded five minutes')

                    live.backup(destination, pages=256, progress=progress, sleep=0.1)
            check_database(snapshot)
            manifest = {'created_utc': stamp, 'database_sha256': sha256(snapshot),
                        'database_bytes': snapshot.stat().st_size,
                        'app_version': next((line.split('=', 1)[1] for line in
                            (root / '.env').read_text().splitlines()
                            if line.startswith('APP_VERSION=')), 'unknown')}
            (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
            partial = stage / 'archive.tar.gz'
            with tarfile.open(partial, 'w:gz') as bundle:
                bundle.add(snapshot, arcname='data/repit-ma.db')
                bundle.add(stage / 'manifest.json', arcname='manifest.json')
            # Verify the actual archived database before uploading it.
            restored = stage / 'restore-check'
            with tarfile.open(partial, 'r:gz') as bundle:
                bundle.extractall(restored, filter='data')
            restored_db = restored / 'data' / 'repit-ma.db'
            if sha256(restored_db) != manifest['database_sha256']:
                raise RuntimeError('Archived database checksum mismatch')
            check_database(restored_db)
            partial.replace(archive)
        print(f'Local archive verified: {archive.name} ({archive.stat().st_size} bytes)', flush=True)
        storage = S3Storage(config)
        # Retry locally retained archives too; never discard an unsuccessful upload.
        for pending in sorted(directory.glob('repit-ma-*.tar.gz')):
            marker = pending.with_name(pending.name + '.uploaded')
            receipt = storage.receipt(pending)
            if not marker.exists() or marker.read_text().strip() != json.dumps(receipt, sort_keys=True):
                storage.upload_verified(pending)
                temporary_marker = marker.with_name(marker.name + '.tmp')
                temporary_marker.write_text(json.dumps(receipt, sort_keys=True) + '\n')
                temporary_marker.replace(marker)
                print(f'Upload verified: {pending.name}', flush=True)
        print(f'Backup verified: s3://{storage.bucket}/{storage.key(archive)}', flush=True)


if __name__ == '__main__':
    try:
        main(sys.argv[1] if len(sys.argv) > 1 else '/etc/repit-ma/backup.json')
    except BlockingIOError:
        print('Backup deferred: deployment or another backup holds .deploy.lock', file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # Avoid traceback/headers/config values containing credentials.
        # SDK errors may contain request details. Log only the S3 error code/status.
        response = getattr(error, 'response', {})
        code = response.get('Error', {}).get('Code', '')
        status = response.get('ResponseMetadata', {}).get('HTTPStatusCode', '')
        print(f'Backup failed: {type(error).__name__}; code={code}; HTTP={status}', file=sys.stderr)
        sys.exit(1)
