import { test } from 'node:test'
import assert from 'node:assert/strict'
import { schedulePage } from '../src/teacher-schedule.ts'

const now = Date.parse('2026-10-08T12:00:00+03:00')
const entry = (id, scheduledAt) => ({ courseId: id, lesson: { id, scheduledAt } })
const entries = Array.from({ length: 14 }, (_, index) => entry(index + 1, `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00`))

test('The schedule filters before pagination and lists past lessons from most recent to oldest', () => {
  const first = schedulePage(entries, 'past', 1, now)
  const second = schedulePage(entries, 'past', 2, now)
  assert.equal(first.total, 8)
  assert.equal(first.totalPages, 2)
  assert.deepEqual(first.items.map(item => item.lesson.id), [8, 7, 6, 5, 4])
  assert.deepEqual(second.items.map(item => item.lesson.id), [3, 2, 1])
  assert.deepEqual([second.start, second.end], [6, 8])
  assert.equal(schedulePage(entries, 'all', 3, now).total, 14)
  assert.deepEqual(schedulePage(entries, 'all', 3, now).items.map(item => item.lesson.id), [4, 3, 2, 1])
})

test('Upcoming lessons are ordered nearest first, and the exact Moscow start belongs to the past', () => {
  const future = schedulePage([...entries].reverse(), 'upcoming', 1, now)
  assert.equal(future.total, 6)
  assert.deepEqual(future.items.map(item => item.lesson.id), [9, 10, 11, 12, 13])
  assert.deepEqual(schedulePage(entries, 'upcoming', 2, now).items.map(item => item.lesson.id), [14])
  assert.deepEqual(entries.map(item => item.lesson.id), Array.from({ length: 14 }, (_, index) => index + 1))
})

test('Refreshes preserve the current page and clamp it when the last page disappears', () => {
  const changed = entries.map(item => ({ ...item, lesson: { ...item.lesson, paid: true, status: 'HELD' } }))
  assert.equal(schedulePage(changed, 'past', 2, now).page, 2)
  assert.deepEqual(schedulePage(changed, 'past', 2, now).items.map(item => item.lesson.id), [3, 2, 1])
  const afterStart = Date.parse('2026-10-09T12:00:00+03:00')
  assert.equal(schedulePage(entries, 'upcoming', 2, afterStart).page, 1)
  const empty = schedulePage(entries, 'upcoming', 3, Date.parse('2026-10-20T12:00:00+03:00'))
  assert.equal(empty.page, 1)
  assert.equal(empty.total, 0)
  assert.deepEqual(empty.items, [])
})
