import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextTap } from '../src/easter-eggs.ts'

test('The goose needs five consecutive taps and a second goose needs five new taps', () => {
  let taps = { count: 0, last: 0 }
  for (let i = 1; i <= 10; i++) {
    taps = nextTap(taps, 10000 + i * 300, 5)
    assert.equal(taps.triggered, i === 5 || i === 10)
  }
})

test('Ordinary separated logo clicks do not accumulate into a surprise', () => {
  let taps = { count: 0, last: 0 }
  for (const time of [10000, 12000, 14000, 16000, 18000]) {
    taps = nextTap(taps, time, 5)
    assert.equal(taps.count, 1)
    assert.equal(taps.triggered, false)
  }
  assert.equal(nextTap({ count: 4, last: 20000 }, 19000, 5).triggered, false)
})

test('Math rain uses three taps, tolerating a short pause between touches', () => {
  let taps = nextTap({ count: 0, last: 0 }, 10000, 3)
  taps = nextTap(taps, 11200, 3)
  assert.equal(taps.triggered, false)
  taps = nextTap(taps, 12400, 3)
  assert.equal(taps.triggered, true)
})
