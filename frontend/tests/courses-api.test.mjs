import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { CourseApi } from '../src/courses-api.ts'

const originalFetch = globalThis.fetch
globalThis.sessionStorage = { getItem: () => 'Basic test' }
afterEach(() => { globalThis.fetch = originalFetch })
const api = new CourseApi(7)

test('An absent solution may be an empty 200 or JSON null', async () => {
  for (const body of ['', 'null']) {
    globalThis.fetch = async () => new Response(body)
    assert.equal(await api.request('/tasks/8/solution'), null)
  }
})

test('A failing grade stays false and requests carry authentication', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/courses/7/solutions/9/grade')
    assert.equal(options.headers.Authorization, 'Basic test')
    assert.equal(JSON.parse(options.body).grade, false)
    return Response.json({ id: 9, grade: false })
  }
  assert.equal((await api.request('/solutions/9/grade', 'PUT', { grade: false })).grade, false)
})

test('Uploads use the correct owner and let the browser set the multipart boundary', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/courses/7/files?ownerType=SOLUTION&ownerId=9')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], undefined)
    assert.equal(options.body.get('file').name, 'ответ.txt')
    return Response.json({ id: 10 })
  }
  await api.upload('SOLUTION', 9, new File(['answer'], 'ответ.txt'))
})

test('Empty and oversized uploads fail before making a network request', async () => {
  globalThis.fetch = () => { assert.fail('Must not upload an invalid file') }
  await assert.rejects(api.upload('LESSON', 1, new File([], 'empty.txt')), /пуст/)
  await assert.rejects(api.upload('LESSON', 1, new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.pdf')), /25 МиБ/)
})

test('Deletion handles 204 and conflicts surface server messages', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await api.request('/tasks/8', 'DELETE'), null)
  globalThis.fetch = async () => Response.json({ message: 'Оценённое решение нельзя редактировать' }, { status: 409 })
  await assert.rejects(api.request('/solutions/9', 'PUT', { description: 'answer' }), /Оценённое решение/)
})
