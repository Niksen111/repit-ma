import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeworkMarkup } from '../src/homework.ts'

const item = {
  courseId: 5, academicYear: '2026/27', studentUsername: 'student', studentName: 'Ученик',
  teacherUsername: 'teacher', teacherName: 'Преподаватель', lessonId: 10, lessonTitle: 'Алгебра',
  scheduledAt: '2026-11-04T15:00:00', taskId: 25, taskTitle: 'Уравнения', description: null,
}

test('Homework queue offers the right participant and action for each role with a direct task link', () => {
  const teacher = homeworkMarkup([item], true)
  assert.match(teacher, /Ученик: <strong>Ученик<\/strong>/)
  assert.match(teacher, /Ожидает проверки/)
  assert.match(teacher, /Проверить решение/)
  const student = homeworkMarkup([item], false)
  assert.match(student, /Преподаватель: <strong>Преподаватель<\/strong>/)
  assert.match(student, /Ожидает сдачи/)
  assert.match(student, /Открыть задание/)
  for (const markup of [teacher, student]) {
    assert.match(markup, /href="\/courses\/5\?lesson=10&amp;task=25"/)
    assert.match(markup, /2026-11-04T15:00:00\+03:00/)
  }
})

test('Homework queue escapes uploaded text and falls back to usernames', () => {
  const unsafe = { ...item, studentName: null, teacherName: null, taskTitle: '<script>alert(1)</script>', lessonTitle: '<b>test</b>', description: '<img src=x onerror=alert(1)>' }
  for (const teacher of [true, false]) {
    const markup = homeworkMarkup([unsafe], teacher)
    assert.doesNotMatch(markup, /<script|<img|<b>/)
    assert.match(markup, /&lt;script&gt;/)
    assert.match(markup, /&lt;img/)
    assert.match(markup, teacher ? /<strong>student<\/strong>/ : /<strong>teacher<\/strong>/)
  }
})

test('Each role has an explicit empty queue state', () => {
  assert.match(homeworkMarkup([], true), /Работ на проверку пока нет/)
  assert.match(homeworkMarkup([], false), /Все домашние задания сданы/)
})
