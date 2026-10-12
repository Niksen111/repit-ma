export interface Review {
  author: string
  role: 'Ученик' | 'Ученица' | 'Родитель'
  grade?: number
  text: string
  source: 'Переписка с учениками' | 'Отзыв с другой площадки' | 'Отзыв ученика или родителя'
  date?: string
  rating?: number
}

export function renderReviews(reviews: readonly Review[], withName: string, escape: (text: string) => string): string {
  const title = 'Отзывы учеников<br>и родителей'
  const introduction = 'Впечатления учеников и родителей о занятиях с ' + withName + '.'
  const cards = reviews.map((review, index) => `<article class="review-card"><div class="review-author"><span class="review-avatar" aria-hidden="true">${escape(review.author[0])}</span><div><h3>${escape(review.author)}</h3><p>${review.role}${review.grade ? ` · ${review.grade} класс` : ''}</p></div>${review.rating ? `<span class="review-rating" aria-label="Оценка ${review.rating} из 5"><span aria-hidden="true">★</span> ${review.rating.toFixed(1)}</span>` : ''}</div><blockquote class="review-text" id="review-text-${index}">${escape(review.text)}</blockquote><button class="review-toggle" type="button" aria-expanded="false" aria-controls="review-text-${index}" hidden>Читать полностью</button><div class="review-source"><span>${review.source}${review.date ? ` · ${review.date}` : ''}</span></div></article>`).join('')
  return `<section class="teacher-reviews" aria-labelledby="reviews-title"><div class="reviews-heading"><div><p class="eyebrow">Обратная связь</p><h2 id="reviews-title">${title}</h2></div><a class="secondary-button" href="/reviews/new">Оставить отзыв ↗</a></div><p class="reviews-intro">${escape(introduction)}</p><div class="reviews-navigation"><span class="reviews-count" role="status" aria-live="polite">Отзыв 1 из ${reviews.length}</span><div class="reviews-arrows"><button class="review-prev" type="button" aria-label="Предыдущий отзыв" aria-controls="reviews-track" disabled>←</button><button class="review-next" type="button" aria-label="Следующий отзыв" aria-controls="reviews-track">→</button></div></div><div class="reviews-track" id="reviews-track" role="region" aria-label="Отзывы о занятиях с ${escape(withName)}" aria-roledescription="карусель" tabindex="0">${cards}</div></section>`
}

export function mountReviews(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('.reviews-track')!
  const cards = Array.from(track.querySelectorAll<HTMLElement>('.review-card'))
  const previous = root.querySelector<HTMLButtonElement>('.review-prev')!
  const next = root.querySelector<HTMLButtonElement>('.review-next')!
  const count = root.querySelector<HTMLElement>('.reviews-count')!
  const disclosures = cards.map(card => {
    const text = card.querySelector<HTMLElement>('.review-text')!
    const button = card.querySelector<HTMLButtonElement>('.review-toggle')!
    text.classList.add('is-collapsed')
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true'
      button.setAttribute('aria-expanded', String(expanded))
      button.textContent = expanded ? 'Свернуть' : 'Читать полностью'
      text.classList.toggle('is-collapsed', !expanded)
      update()
    })
    return { text, button }
  })
  const position = (card: HTMLElement) => card.offsetLeft - cards[0].offsetLeft
  const currentIndex = () => cards.reduce((closest, card, index) => Math.abs(position(card) - track.scrollLeft) < Math.abs(position(cards[closest]) - track.scrollLeft) ? index : closest, 0)
  const update = () => {
    disclosures.forEach(({ text, button }) => {
      button.hidden = button.getAttribute('aria-expanded') !== 'true' && text.scrollHeight <= text.clientHeight + 1
    })
    // Offscreen expanded reviews must not reserve vertical space for the visible cards.
    const visibleCards = cards.filter(card => position(card) + card.offsetWidth > track.scrollLeft + 1
      && position(card) < track.scrollLeft + track.clientWidth - 1)
    const trackStyle = getComputedStyle(track)
    const padding = parseFloat(trackStyle.paddingTop) + parseFloat(trackStyle.paddingBottom)
    const scrollbar = track.offsetHeight - track.clientHeight
    const height = Math.max(0, ...visibleCards.map(card => card.offsetHeight)) + padding + scrollbar
    track.style.height = `${height}px`
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
  const observer = new ResizeObserver(update)
  observer.observe(track)
  cards.forEach(card => observer.observe(card))
  void document.fonts.ready.then(update)
  update()
}
