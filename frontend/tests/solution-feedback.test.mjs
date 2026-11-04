import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeworkStatus, completionMarkup } from '../src/course-learning.ts'
import { saveGradeWithFiles } from '../src/solution-feedback.ts'

test('Manual completion is distinct from submission and a grade always determines submitted work status', () => {
  const task = { id: 1, completed: true }
  assert.equal(homeworkStatus(task, null), 'Сделано без решения')
  assert.equal(homeworkStatus({ ...task, completed: false }, null), 'Не отправлено')
  assert.match(completionMarkup(task, null), /aria-pressed="true".*Снять отметку/)
  for (const [grade, expected] of [[null, 'Ожидает проверки'], [false, 'Незачёт'], [true, 'Зачёт']]) {
    assert.equal(homeworkStatus(task, { grade }), expected)
    assert.equal(completionMarkup(task, { grade }), '')
  }
})

function gradeData() {
  const data = new FormData()
  data.set('grade', 'false')
  data.set('teacherComment', ' Разбор ')
  return data
}

test('Grade saves before uploads, retains a failing grade, and reports partial failures while attempting every file', async () => {
  const calls = []
  const api = {
    async request(path, method, body) { calls.push('grade'); assert.equal(path, '/solutions/4/grade'); assert.equal(method, 'PUT'); assert.deepEqual(body, { grade: false, teacherComment: 'Разбор' }) },
    async upload(owner, id, file) { assert.equal(owner, 'GRADE'); assert.equal(id, 4); calls.push(file.name); if (file.name === 'bad.pdf') throw new Error('Ошибка сети') },
  }
  const data = gradeData()
  for (const name of ['good.png', 'bad.pdf', 'last.jpg']) data.append('gradeFiles', new File(['bytes'], name))
  const failures = await saveGradeWithFiles(api, 4, data)
  assert.deepEqual(calls, ['grade', 'good.png', 'bad.pdf', 'last.jpg'])
  assert.deepEqual(failures, ['bad.pdf: Ошибка сети'])
})

test('Invalid files reject before changing the grade or uploading anything', async () => {
  const api = { request() { assert.fail('Must validate first') }, upload() { assert.fail('Must validate first') } }
  for (const file of [new File([], 'empty.txt'), new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.pdf')]) {
    const data = gradeData()
    data.append('gradeFiles', file)
    await assert.rejects(saveGradeWithFiles(api, 4, data), /пуст|25 МиБ/)
  }
})

test('A failed grade request prevents uploads and an empty chooser saves just the grade', async () => {
  const data = gradeData()
  data.append('gradeFiles', new File(['bytes'], 'answer.pdf'))
  await assert.rejects(saveGradeWithFiles({ async request() { throw new Error('Нет доступа') }, upload() { assert.fail('Grade failed') } }, 4, data), /Нет доступа/)
  const empty = gradeData()
  empty.append('gradeFiles', new File([], ''))
  let saved = false
  assert.deepEqual(await saveGradeWithFiles({ async request() { saved = true }, upload() { assert.fail('No file chosen') } }, 4, empty), [])
  assert.equal(saved, true)
})
