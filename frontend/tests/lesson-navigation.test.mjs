import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectLesson, pageForLesson, lessonPage } from '../src/lesson-navigation.ts'

const now = Date.parse('2026-10-08T12:00:00+03:00')
const lesson = (id, scheduledAt, status = 'SCHEDULED') => ({ id, scheduledAt, status })
const lessons = [
  lesson(1, '2026-10-15T16:00:00'),
  lesson(2, '2026-10-09T16:00:00', 'CANCELLED'),
  lesson(3, '2026-10-10T16:00:00'),
  lesson(4, '2026-10-07T16:00:00', 'HELD'),
  lesson(5, '2026-10-06T16:00:00', 'PAST'),
]

test('Opening a course selects the nearest future lesson, skipping cancellations', () => {
  assert.equal(selectLesson(lessons, null, now), 3)
  assert.equal(selectLesson([...lessons].reverse(), null, now), 3)
  assert.equal(selectLesson(lessons, 999, now), 3)
})

test('Without future lessons, the most recent past lesson is selected, including the exact start', () => {
  assert.equal(selectLesson(lessons.slice(3), null, now), 4)
  const atStart = [...lessons.slice(3), lesson(6, '2026-10-08T12:00:00')]
  assert.equal(selectLesson(atStart, null, now), 6)
})

test('An explicit selection or schedule link survives refreshes, including cancelled lessons', () => {
  assert.equal(selectLesson(lessons, 5, now), 5)
  assert.equal(selectLesson(lessons, 2, now), 2)
  assert.equal(selectLesson(lessons.filter(item => item.id !== 5), 5, now), 3)
})

test('Empty courses and courses with only cancellations remain accessible', () => {
  assert.equal(selectLesson([], null, now), null)
  assert.equal(selectLesson([lessons[1]], null, now), 2)
})

test('Pages bound the list to five lessons and include every lesson exactly once', () => {
  const many = Array.from({ length: 12 }, (_, index) => lesson(index + 1, '2026-10-08T16:00:00'))
  const pages = [1, 2, 3].map(page => lessonPage(many, page))
  assert.deepEqual(pages.map(page => page.items.length), [5, 5, 2])
  assert.deepEqual(pages.flatMap(page => page.items), many)
  assert.deepEqual(pages.map(({ start, end }) => [start, end]), [[1, 5], [6, 10], [11, 12]])
  assert.equal(pageForLesson(many, 6), 2)
  assert.equal(pageForLesson(many, 12), 3)
  assert.equal(pageForLesson(many, 999), 1)
})

test('Pagination clamps after deleting the last page and handles empty and single-page courses', () => {
  assert.deepEqual(lessonPage([], 3), { page: 1, totalPages: 1, items: [], start: 0, end: 0 })
  assert.equal(lessonPage(lessons, 2).page, 1)
  assert.equal(lessonPage(lessons, 0).page, 1)
  assert.equal(lessonPage(lessons, 1).totalPages, 1)
})
