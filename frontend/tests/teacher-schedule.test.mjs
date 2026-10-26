import { test } from 'node:test'
import assert from 'node:assert/strict'
import { schedulePage } from '../src/teacher-schedule.ts'

const now = Date.parse('2026-10-08T12:00:00+03:00')
const entry = (id, scheduledAt) => ({ courseId: id, lesson: { id, scheduledAt } })
const entries = Array.from({ length: 14 }, (_, index) => entry(index + 1, `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00`))
const many = Array.from({ length: 45 }, (_, index) => entry(index + 1, new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString().slice(0, 19)))

test('The schedule filters before pagination and lists past lessons from most recent to oldest', () => {
  const first = schedulePage(entries, 'past', 1, now)
  assert.equal(first.total, 8)
  assert.equal(first.totalPages, 1)
  assert.deepEqual(first.items.map(item => item.lesson.id), [8, 7, 6, 5, 4, 3, 2, 1])
  assert.deepEqual([first.start, first.end], [1, 8])
  assert.equal(schedulePage(entries, 'all', 3, now).total, 14)
  assert.deepEqual(schedulePage(entries, 'all', 3, now).items.map(item => item.lesson.id), [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
})

test('Upcoming lessons are ordered nearest first, and the exact Moscow start belongs to the past', () => {
  const future = schedulePage([...entries].reverse(), 'upcoming', 1, now)
  assert.equal(future.total, 6)
  assert.deepEqual(future.items.map(item => item.lesson.id), [9, 10, 11, 12, 13, 14])
  assert.deepEqual(entries.map(item => item.lesson.id), Array.from({ length: 14 }, (_, index) => index + 1))
})

test('Refreshes preserve the current page and clamp it when the last page disappears', () => {
  const changed = many.map(item => ({ ...item, lesson: { ...item.lesson, paid: true, status: 'HELD' } }))
  assert.equal(schedulePage(changed, 'past', 2, now).page, 2)
  assert.deepEqual(schedulePage(changed, 'past', 2, now).items.map(item => item.lesson.id), Array.from({ length: 20 }, (_, index) => 25 - index))
  assert.equal(schedulePage(changed.slice(0, 20), 'past', 2, now).page, 1)
  const afterStart = Date.parse('2026-10-09T12:00:00+03:00')
  assert.equal(schedulePage(entries, 'upcoming', 2, afterStart).page, 1)
  const empty = schedulePage(entries, 'upcoming', 3, Date.parse('2026-10-20T12:00:00+03:00'))
  assert.equal(empty.page, 1)
  assert.equal(empty.total, 0)
  assert.deepEqual(empty.items, [])
})

test('Schedule pages contain twenty lessons and cover every entry once', () => {
  const pages = [1, 2, 3].map(page => schedulePage(many, 'all', page, now))
  assert.deepEqual(pages.map(page => page.items.length), [20, 20, 5])
  assert.deepEqual(pages.map(({ start, end }) => [start, end]), [[1, 20], [21, 40], [41, 45]])
  assert.deepEqual(pages.flatMap(page => page.items).map(item => item.lesson.id), Array.from({ length: 45 }, (_, index) => 45 - index))
})
