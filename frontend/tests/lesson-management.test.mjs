import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lessonInstant, lessonDate, lessonStatus, trackingMarkup, receiptsMarkup } from '../src/lesson-management.ts'

const lesson = { id: 1, title: 'Занятие', description: null, scheduledAt: '2026-10-07T16:00:00', status: 'SCHEDULED', paid: false }

test('Moscow wall time resolves to the same instant regardless of the browser timezone', () => {
  assert.equal(lessonInstant(lesson.scheduledAt), Date.parse('2026-10-07T13:00:00Z'))
  assert.match(lessonDate(lesson.scheduledAt), /16:00/)
  const start = lessonInstant(lesson.scheduledAt)
  assert.equal(lessonStatus(lesson, start - 1), 'SCHEDULED')
  assert.equal(lessonStatus(lesson, start), 'PAST')
  assert.equal(lessonStatus({ ...lesson, status: 'CANCELLED' }, start - 1), 'CANCELLED')
  assert.equal(lessonStatus({ ...lesson, status: 'CANCELLED' }, start + 1), 'CANCELLED')
  assert.equal(lessonStatus({ ...lesson, status: 'HELD' }, start + 1), 'HELD')
})

test('Only past lessons offer the held outcome, while cancellation and payment are always available', () => {
  const future = trackingMarkup({ ...lesson, scheduledAt: '2999-01-01T16:00:00' }, true)
  assert.doesNotMatch(future, /value="HELD"/)
  assert.match(future, /value="CANCELLED"/)
  assert.match(future, /data-paid/)
  const past = trackingMarkup({ ...lesson, scheduledAt: '2000-01-01T16:00:00', status: 'HELD', paid: true }, true)
  assert.match(past, /value="HELD" selected/)
  assert.match(past, /data-paid checked/)
  assert.doesNotMatch(trackingMarkup(lesson, false), /select|input/)
})

test('Students can download receipts; teachers can attach and remove them; filenames are escaped', () => {
  const files = [{ id: 2, originalName: '<img src=x onerror=alert(1)>.pdf', contentType: 'application/pdf' }]
  const student = receiptsMarkup(files, false)
  assert.match(student, /data-receipt-download="2"/)
  assert.match(student, /&lt;img/)
  assert.doesNotMatch(student, /data-receipt-remove|data-receipt-upload|<img/)
  const teacher = receiptsMarkup(files, true)
  assert.match(teacher, /data-receipt-remove="2"/)
  assert.match(teacher, /data-receipt-upload/)
})
