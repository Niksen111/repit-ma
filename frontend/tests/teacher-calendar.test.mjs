import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calendarDate, calendarMonday, shiftCalendarDate, calendarWeek, calendarHours } from '../src/teacher-calendar.ts'

const entry = (id, scheduledAt) => ({ courseId: id, lesson: { id, scheduledAt } })

test('Calendar uses Moscow today and Monday weeks across year boundaries', () => {
  assert.equal(calendarDate(Date.parse('2026-10-25T21:30:00Z')), '2026-10-26')
  assert.equal(calendarMonday('2027-01-03'), '2026-12-28')
  assert.equal(calendarMonday('2026-10-26'), '2026-10-26')
  assert.equal(shiftCalendarDate('2026-12-28', 7), '2027-01-04')
})

test('Week excludes adjacent dates and positions lessons by Moscow hours and minutes', () => {
  const entries = [entry(1, '2026-10-25T12:00:00'), entry(2, '2026-10-26T09:30:00'), entry(3, '2026-11-01T22:00:00'), entry(4, '2026-11-02T12:00:00')]
  const week = calendarWeek(entries, '2026-10-26')
  assert.equal(week.length, 7)
  assert.deepEqual(week.flatMap(day => day.items.map(item => item.entry.lesson.id)), [2, 3])
  assert.equal(week[0].items[0].start, 570)
  assert.equal(week[0].items[0].end, 630)
  assert.equal(entries.length, 4)
})

test('Overlapping lessons get separate lanes; touching lessons reuse full width', () => {
  const week = calendarWeek([entry(1, '2026-10-26T09:00:00'), entry(2, '2026-10-26T09:00:00'), entry(3, '2026-10-26T09:30:00'), entry(4, '2026-10-26T10:30:00')], '2026-10-26')
  assert.deepEqual(week[0].items.map(({lane, lanes}) => [lane, lanes]), [[0, 3], [1, 3], [2, 3], [0, 1]])
})

test('Hour-long lessons crossing midnight continue into the next day and week', () => {
  const week = calendarWeek([entry(1, '2026-10-25T23:30:00'), entry(2, '2026-10-26T23:30:00')], '2026-10-26')
  assert.deepEqual(week[0].items.map(({start, end}) => [start, end]), [[0, 30], [1410, 1440]])
  assert.deepEqual(week[1].items.map(({start, end}) => [start, end]), [[0, 30]])
  assert.equal(calendarWeek([], '2026-10-26').flatMap(day => day.items).length, 0)
})

test('Sparse afternoon weeks hide unused hours and retain eight hours of context', () => {
  const days = calendarWeek([entry(1, '2026-10-26T15:30:00'), entry(2, '2026-10-28T15:00:00')], '2026-10-26')
  assert.deepEqual(calendarHours(days), { start: 12, end: 20 })
  assert.deepEqual(calendarHours(days, true), { start: 0, end: 24 })
  assert.deepEqual(calendarHours(calendarWeek([], '2026-10-26')), { start: 8, end: 22 })
})

test('Automatic hours include early, late and midnight lessons without clipping', () => {
  for (const times of [['00:00:00'], ['23:00:00'], ['23:30:00'], ['06:30:00', '22:30:00'], ['10:00:00', '19:30:00']]) {
    const days = calendarWeek(times.map((time, index) => entry(index, `2026-10-26T${time}`)), '2026-10-26')
    const hours = calendarHours(days)
    assert.ok(hours.start >= 0 && hours.end <= 24)
    assert.ok(hours.end - hours.start >= 8)
    for (const item of days.flatMap(day => day.items)) {
      assert.ok(item.start >= hours.start * 60)
      assert.ok(item.end <= hours.end * 60)
    }
  }
})
