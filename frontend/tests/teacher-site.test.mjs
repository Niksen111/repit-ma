import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getTeacherSite, teacherSites, renderTeacherContacts } from '../src/teacher-site.ts'
import { renderOlgaHome, olgaReviews } from '../src/olga-home.ts'
import { renderEgorHome, egorReviews } from '../src/egor-home.ts'

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
  assert.equal((await getTeacherSite('mathegor.localhost')).key, 'egor')
  await assert.rejects(getTeacherSite('mathegor.repit-ma.ru'))
})

test('Egor is selected by the public API on his production domain', async () => {
  globalThis.fetch = async () => Response.json({ teacher: 'egor' })
  assert.equal((await getTeacherSite('mathegor.repit-ma.ru')).key, 'egor')
})

test('Egor homepage preserves his offer and displays real reviews with supplied ratings', () => {
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  const page = renderEgorHome(escape)
  for (const text of ['Егор', 'СПбГУ', 'МГУ', 'САММАТ', 'ОММО', 'ВсОШ', '60 минут', '2000 ₽', 'Цена фиксируется на весь учебный год.', 'Zoom', 'Discord', 'Яндекс Телемост']) {
    assert.ok(page.includes(text), text)
  }
  assert.equal(egorReviews.length, 6)
  assert.deepEqual(egorReviews.map(review => review.author), ['Елена', 'Саша', 'Юлия', 'Тимур', 'Надежда', 'Никита'])
  assert.deepEqual(egorReviews.filter(review => review.rating).map(review => [review.author, review.rating]), [['Елена', 5], ['Надежда', 5]])
  assert.ok(egorReviews.every(review => review.source === 'Отзыв ученика или родителя' && !review.date && !review.grade))
  assert.ok(page.includes('Отзывы учеников<br>и родителей'))
  assert.ok(!page.includes('Примеры отзывов'))
  assert.ok(!page.includes('вымышленные'))
  assert.equal((page.match(/aria-label="Оценка 5 из 5"/g) ?? []).length, 2)
  assert.equal((page.match(/<article class="review-card">/g) ?? []).length, 6)
  assert.ok(!page.includes('из переписки с учениками'))
  assert.ok(!page.includes('БЕСПЛАТНОЕ'))
  assert.ok(!page.includes('olga-koroleva.jpg'))
  const contacts = renderTeacherContacts(teacherSites.egor, escape)
  assert.ok(contacts.includes('https://max.ru/u/f9LHodD0cOJqb9xoKQuDAAKtPxXFNQiV25ndmaYntNCFzSnbWBuXiqmZioo'))
  assert.ok(contacts.includes('https://t.me/eztguser'))
  assert.ok(contacts.includes('@eztguser'))
  assert.ok(contacts.includes('mailto:zagidulinegor@yandex.ru'))
  assert.ok(!contacts.includes('towardsutopia'))
  assert.ok(!contacts.includes('supruno7'))
  assert.ok(!contacts.includes('l_ondal'))
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
