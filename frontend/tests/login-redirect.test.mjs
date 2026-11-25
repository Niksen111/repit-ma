import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loginDestination } from '../src/login-redirect.ts'

test('Login returns to the requested protected page with its query and fragment', () => {
  for (const next of [
    '/account?tab=profile',
    '/calendar',
    '/courses/42?lesson=3&task=7#solution',
    '/homework',
    '/learning',
    '/register',
    '/reviews/new',
    '/schedule',
    '/students',
  ]) {
    assert.equal(loginDestination(new URLSearchParams({ next }).toString()), next)
  }
})

test('Login defaults to the account when no supported destination is provided', () => {
  assert.equal(loginDestination(''), '/account')
  for (const next of ['https://example.com/calendar', '//example.com/calendar', '/\\example.com', '/login', '/about', '/courses/unknown']) {
    assert.equal(loginDestination(new URLSearchParams({ next }).toString()), '/account')
  }
})
