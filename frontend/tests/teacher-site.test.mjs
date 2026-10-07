import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getTeacherSite, teacherSites, renderTeacherContacts } from '../src/teacher-site.ts'
import { renderOlgaHome, olgaReviews } from '../src/olga-home.ts'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('The server selects the teacher and requests stay on the current origin', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/public/site')
    assert.equal(options.cache, 'no-store')
    return Response.json({ teacher: 'olga' })
  }
  assert.equal((await getTeacherSite('okoroleva.repit-ma.ru')).key, 'olga')
})

test('Unavailable production API does not fall back to Maria', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 })
  await assert.rejects(getTeacherSite('okoroleva.repit-ma.ru'))
  assert.equal((await getTeacherSite('okoroleva.localhost')).key, 'olga')
  assert.equal((await getTeacherSite('localhost')).key, 'maria')
})

test('Invalid teacher response is rejected on production', async () => {
  globalThis.fetch = async () => Response.json({ teacher: 'unknown' })
  await assert.rejects(getTeacherSite('okoroleva.repit-ma.ru'))
})

test('Olga homepage and review contacts use her own content', () => {
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  const page = renderOlgaHome(escape)
  assert.equal(olgaReviews.length, 6)
  assert.ok(page.includes('Королева Ольга Евгеньевна'))
  assert.ok(page.includes('Ольгой Евгеньевной'))
  assert.ok(page.includes('href="/reviews/new"'))
  assert.ok(!page.includes('Марией'))
  assert.ok(!page.includes('Посмотреть оригинал'))
  const contacts = renderTeacherContacts(teacherSites.olga, escape)
  assert.ok(contacts.includes('https://t.me/l_ondal'))
  assert.ok(contacts.includes('tel:+79111150916'))
  assert.ok(!contacts.includes('supruno7'))
})
