import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewContentType } from '../src/file-preview.ts'
import { receiptsMarkup } from '../src/lesson-management.ts'

test('Old attachments with generic MIME types can preview JPG, JPEG, PNG and PDF, including uppercase names', () => {
  for (const [name, expected] of [['Фото.JPG', 'image/jpeg'], ['scan.jpeg', 'image/jpeg'], ['scan.PnG', 'image/png'], ['чек.PDF', 'application/pdf']]) {
    assert.equal(previewContentType({ originalName: name, contentType: 'application/octet-stream' }), expected)
  }
})

test('HTML, SVG and other documents never get previewed, even with a forged image MIME type', () => {
  for (const name of ['file.html', 'image.svg', 'book.docx', 'image.png.html', 'no-extension', 'pdf', 'constructor', 'file.__proto__']) {
    assert.equal(previewContentType({ originalName: name, contentType: 'image/png' }), null)
  }
})

test('Receipt preview and download are offered to readers and teachers only for supported files', () => {
  const files = [
    { id: 1, originalName: 'чек.pdf', contentType: 'application/pdf' },
    { id: 2, originalName: 'архив.zip', contentType: 'application/zip' },
  ]
  for (const teacher of [false, true]) {
    const markup = receiptsMarkup(files, teacher)
    assert.match(markup, /data-receipt-preview="1"/)
    assert.doesNotMatch(markup, /data-receipt-preview="2"/)
    assert.match(markup, /data-receipt-download="1"/)
    assert.match(markup, /data-receipt-download="2"/)
  }
})
