export interface Review {
  author: string
  role: 'Ученик' | 'Ученица' | 'Родитель'
  grade?: number
  text: string
  source: 'Переписка с учениками' | 'Отзыв с другой площадки'
  date?: string
  rating?: number
}

export function renderReviews(reviews: readonly Review[], withName: string, escape: (text: string) => string): string {
  const cards = reviews.map(review => `<article class="review-card"><div class="review-author"><span class="review-avatar" aria-hidden="true">${escape(review.author[0])}</span><div><h3>${escape(review.author)}</h3><p>${review.role}${review.grade ? ` · ${review.grade} класс` : ''}</p></div>${review.rating ? `<span class="review-rating" aria-label="Оценка ${review.rating} из 5"><span aria-hidden="true">★</span> ${review.rating.toFixed(1)}</span>` : ''}</div><blockquote>${escape(review.text)}</blockquote><div class="review-source"><span>${review.source}${review.date ? ` · ${review.date}` : ''}</span></div></article>`).join('')
  return `<section class="teacher-reviews" aria-labelledby="reviews-title"><div class="reviews-heading"><div><p class="eyebrow">Обратная связь</p><h2 id="reviews-title">Отзывы учеников<br>и родителей</h2></div><a class="secondary-button" href="/reviews/new">Оставить отзыв ↗</a></div><p class="reviews-intro">О занятиях с ${escape(withName)} — из переписки с учениками и отзывов на других площадках.</p><div class="reviews-track" id="reviews-track" role="region" aria-label="Отзывы о занятиях с ${escape(withName)}" aria-roledescription="карусель" tabindex="0">${cards}</div><div class="reviews-navigation"><span class="reviews-count" role="status" aria-live="polite">Отзыв 1 из ${reviews.length}</span><div class="reviews-arrows"><button class="review-prev" type="button" aria-label="Предыдущий отзыв" aria-controls="reviews-track" disabled>←</button><button class="review-next" type="button" aria-label="Следующий отзыв" aria-controls="reviews-track">→</button></div></div></section>`
}

export function mountReviews(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('.reviews-track')!
  const cards = Array.from(track.querySelectorAll<HTMLElement>('.review-card'))
  const previous = root.querySelector<HTMLButtonElement>('.review-prev')!
  const next = root.querySelector<HTMLButtonElement>('.review-next')!
  const count = root.querySelector<HTMLElement>('.reviews-count')!
  const position = (card: HTMLElement) => card.offsetLeft - cards[0].offsetLeft
  const currentIndex = () => cards.reduce((closest, card, index) => Math.abs(position(card) - track.scrollLeft) < Math.abs(position(cards[closest]) - track.scrollLeft) ? index : closest, 0)
  const update = () => {
    previous.disabled = track.scrollLeft <= 2
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2
    const first = currentIndex() + 1
    const visible = Math.max(1, Math.round(track.clientWidth / cards[0].getBoundingClientRect().width))
    const last = Math.min(cards.length, first + visible - 1)
    count.textContent = first === last ? `Отзыв ${first} из ${cards.length}` : `Отзывы ${first}–${last} из ${cards.length}`
  }
  const move = (direction: number) => {
    const index = Math.max(0, Math.min(cards.length - 1, currentIndex() + direction))
    track.scrollTo({ left: position(cards[index]), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  previous.addEventListener('click', () => move(-1))
  next.addEventListener('click', () => move(1))
  track.addEventListener('scroll', update, { passive: true })
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    move(event.key === 'ArrowRight' ? 1 : -1)
  })
  new ResizeObserver(update).observe(track)
  update()
}
