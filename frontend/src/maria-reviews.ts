// Curated content for Maria's public landing page, independent of account IDs.
// Keep other teachers' testimonials in their own page data until public profiles exist.
interface Review {
  author: string
  role: 'Ученик' | 'Ученица' | 'Родитель'
  grade?: number
  text: string
  source: 'Переписка с учениками' | 'Отзыв с другой площадки'
  date?: string
  rating?: number
}

export const mariaReviews: readonly Review[] = [
  {
    author: 'Маша', role: 'Ученица', grade: 11,
    text: 'Я хочу сказать вам огромное спасибо за нашу двухлетнюю совместную работу, потому что по большей части благодаря вам у меня такой хороший результат ❤️ Помимо всего я узнала и об олимпиадной математике, хоть раньше даже не решалась её понимать. Я всегда ждала следующего занятия чтобы разобрать что-нибудь интересненькое)) Спасибо вам! 💖',
    source: 'Переписка с учениками',
  },
  {
    author: 'Елена', role: 'Родитель', date: '10 декабря 2024', rating: 5,
    text: 'Положительный отзыв. Замечательный педагог. Дочке она очень понравилась. Занятия были продуктивными. Репетитор помогла разобрать задачи из списка дочери.',
    source: 'Отзыв с другой площадки',
  },
  {
    author: 'Егор', role: 'Ученик', grade: 9,
    text: 'Учусь в 9 классе, проходил онлайн-подготовку по олимпиадной математике у Марии Александровны. Хочу сказать большое спасибо за этот модуль! Мне особенно понравилось, как Мария Александровна объясняет сложные темы простыми словами. Задачи были очень интересными и нестандартными, они заставили по-настоящему подумать. Занятия здорово помогли мне по-новому взглянуть на математику и научили не бояться сложных заданий. Спасибо за крутую атмосферу и полезные знания!',
    source: 'Переписка с учениками',
  },
  {
    author: 'Александра', role: 'Родитель', date: '7 июля 2025', rating: 5,
    text: 'Положительный отзыв. Репетитор понравилась, она нам очень помогла, занятия проходили отлично.',
    source: 'Отзыв с другой площадки',
  },
  {
    author: 'Никита', role: 'Ученик', grade: 8,
    text: 'Меня зовут Никита, 8 класс. Я прохожу онлайн-подготовку по олимпиадной математике. Мне понравилось что учитель понятно объясняет. Прошел уже разные курсы по комбинаторике, теории чисел и сейчас прохожу алгебру, эти курсы были полезными.',
    source: 'Переписка с учениками',
  },
  {
    author: 'Вика', role: 'Ученица', grade: 10,
    text: 'Учусь в 10 классе, проходила онлайн-подготовку по олимпиадной математике у Марии Александровны. Очень понравился данный курс, повторила и усвоила новые темы, домашнии работы очень интересные, помогло с разбором некоторых заданий олимпиад и усвоением тем, которые ранее были не понятны!',
    source: 'Переписка с учениками',
  },
  {
    author: 'Любовь', role: 'Родитель', date: '14 апреля 2025', rating: 5,
    text: 'Все положительно. Ребенку нравились занятия, с репетитором были хорошие отношения.',
    source: 'Отзыв с другой площадки',
  },
  {
    author: 'Слава', role: 'Ученик', grade: 10,
    text: 'Меня зовут Слава я учусь в 10 классе и я прохожу онлайн-подготовку по олимпиадной математике. Мне очень нравятся уроки и как их ведут, особенно приятно что уроки идут не только в устном формате, но и наглядно показываются. Также хочу отметить что при выполнение задания ученикам помогают и поясняют решения, что крайне хорошо сказывается на запоминание пройденного материала. Да и в целом уроки очень приятные и понятные.',
    source: 'Переписка с учениками',
  },
  {
    author: 'Аня', role: 'Ученица', grade: 10,
    text: 'Меня зовут Кириндас Анна, учусь в 10 классе. Я прохожу онлайн-подготовку по олимпиадной математике. Сейчас я прохожу курс по алгебре, до этого по теории чисел. Мне понравился формат уроков и оптимальная сложность заданий. Благодаря этим курсам я научилась различным приёмам решения задач, узнала много нового.',
    source: 'Переписка с учениками',
  },
  {
    author: 'Никита', role: 'Ученик', grade: 10,
    text: 'Я учусь в 10 классе, проходил курсы по олимпиадной математике у Марии Александровны. Мне все очень понравилось, мы разобрали много интересных тем, учитель объясняет подробно, понятно и с примерами заданий на изучаемую тему. Еще понравилось то, что было много практики.',
    source: 'Переписка с учениками',
  },
  {
    author: 'Аня', role: 'Ученица', grade: 11,
    text: 'Привеееет! Спасибо большое за занятия и все знания ❤️❤️❤️ они были лучшими, уже скучаю',
    source: 'Переписка с учениками',
  },
  {
    author: 'Даниил', role: 'Ученик', date: '12 декабря 2024', rating: 5,
    text: 'Положительный отзыв. Репетитор понятно объясняет материал. С ней комфортно заниматься. Помогла мне подтянуть математику.',
    source: 'Отзыв с другой площадки',
  },
]

export function reviewLoginDestination(search: string): string {
  return new URLSearchParams(search).get('next') === '/reviews/new' ? '/reviews/new' : '/account'
}

export function renderMariaReviews(escape: (text: string) => string): string {
  const cards = mariaReviews.map(review => `<article class="review-card"><div class="review-author"><span class="review-avatar" aria-hidden="true">${escape(review.author[0])}</span><div><h3>${escape(review.author)}</h3><p>${review.role}${review.grade ? ` · ${review.grade} класс` : ''}</p></div>${review.rating ? `<span class="review-rating" aria-label="Оценка ${review.rating} из 5"><span aria-hidden="true">★</span> ${review.rating.toFixed(1)}</span>` : ''}</div><blockquote>${escape(review.text)}</blockquote><div class="review-source"><span>${review.source}${review.date ? ` · ${review.date}` : ''}</span></div></article>`).join('')
  return `<section class="teacher-reviews" aria-labelledby="reviews-title"><div class="reviews-heading"><div><p class="eyebrow">Обратная связь</p><h2 id="reviews-title">Отзывы учеников<br>и родителей</h2></div><a class="secondary-button" href="/reviews/new">Оставить отзыв ↗</a></div><p class="reviews-intro">О занятиях с Марией Александровной — из переписки с учениками и отзывов на других площадках.</p><div class="reviews-track" id="reviews-track" role="region" aria-label="Отзывы о занятиях с Марией" aria-roledescription="карусель" tabindex="0">${cards}</div><div class="reviews-navigation"><span class="reviews-count" role="status" aria-live="polite">Отзыв 1 из ${mariaReviews.length}</span><div class="reviews-arrows"><button class="review-prev" type="button" aria-label="Предыдущий отзыв" aria-controls="reviews-track" disabled>←</button><button class="review-next" type="button" aria-label="Следующий отзыв" aria-controls="reviews-track">→</button></div></div></section>`
}

export function mountMariaReviews(root: HTMLElement): void {
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
