import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mariaReviews, reviewLoginDestination } from '../src/maria-reviews.ts'

test('Ratings only belong to platform reviews', () => {
  assert.equal(mariaReviews.length, 12)
  for (const review of mariaReviews) {
    if (review.source === 'Переписка с учениками') {
      assert.equal(review.rating, undefined)
      assert.equal(review.date, undefined)
    }
  }
})

test('Login returns to review contact only for the allowed route', () => {
  assert.equal(reviewLoginDestination('?next=%2Freviews%2Fnew'), '/reviews/new')
  for (const search of ['', '?next=https://example.com', '?next=//example.com', '?next=/students']) {
    assert.equal(reviewLoginDestination(search), '/account')
  }
})
