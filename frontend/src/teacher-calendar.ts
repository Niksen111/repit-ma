import { getAuthorization } from './auth-api.ts'
import { CourseApi, type ScheduledLesson } from './courses-api.ts'
import { bindLessonManagement, escape, lessonDate, lessonStatus, statusNames, trackingMarkup } from './lesson-management.ts'

const DAY = 86_400_000
export const calendarDate = (now = Date.now()): string => new Date(now + 3 * 3_600_000).toISOString().slice(0, 10)
export const shiftCalendarDate = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
export function calendarMonday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return shiftCalendarDate(date, -((day + 6) % 7))
}

// Dates remain Moscow wall dates; each lesson lasts one hour by default.
export function calendarWeek(entries: ScheduledLesson[], monday: string) {
  return Array.from({ length: 7 }, (_, day) => {
    const date = shiftCalendarDate(monday, day)
    const items = entries.filter(entry => entry.lesson.scheduledAt.slice(0, 10) === date || (entry.lesson.scheduledAt.slice(0, 10) === shiftCalendarDate(date, -1) && entry.lesson.scheduledAt.slice(11, 19) > '23:00:00'))
      .sort((a, b) => a.lesson.scheduledAt.localeCompare(b.lesson.scheduledAt) || a.lesson.id - b.lesson.id)
      .map(entry => {
        const time = entry.lesson.scheduledAt.slice(11)
        const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + Number(time.slice(6, 8) || 0) / 60
        const continuation = entry.lesson.scheduledAt.slice(0, 10) !== date
        const start = continuation ? 0 : minute
        return { entry, start, end: continuation ? minute + 60 - 1440 : Math.min(start + 60, 1440), lane: 0, lanes: 1 }
      })
    let group: typeof items = []
    let ends: number[] = []
    const finish = () => { group.forEach(item => { item.lanes = ends.length }); group = []; ends = [] }
    for (const item of items) {
      if (group.length && item.start >= Math.max(...ends)) finish()
      let lane = ends.findIndex(end => end <= item.start)
      if (lane === -1) lane = ends.length
      item.lane = lane
      ends[lane] = item.end
      group.push(item)
    }
    finish()
    return { date, items }
  })
}

const dayLabel = (date: string, options: Intl.DateTimeFormatOptions): string => new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { ...options, timeZone: 'UTC' })

export function calendarHours(days: ReturnType<typeof calendarWeek>, fullDay = false): { start: number; end: number } {
  if (fullDay) return { start: 0, end: 24 }
  const items = days.flatMap(day => day.items)
  if (!items.length) return { start: 8, end: 22 }
  let start = Math.max(0, Math.floor(Math.min(...items.map(item => item.start)) / 60) - 1)
  let end = Math.min(24, Math.ceil(Math.max(...items.map(item => item.end)) / 60) + 1)
  // Keep at least eight hours for orientation, while fitting sparse weeks more tightly.
  const missing = Math.max(0, 8 - (end - start))
  start = Math.max(0, start - Math.ceil(missing / 2))
  end = Math.min(24, Math.max(end, start + 8))
  start = Math.max(0, Math.min(start, end - 8))
  return { start, end }
}

export function mountTeacherCalendar(root: HTMLElement): void {
  let entries: ScheduledLesson[] = []
  let monday = calendarMonday(calendarDate())
  let selected: ScheduledLesson | undefined
  let fullDay = false
  root.innerHTML = `<div class="calendar-toolbar"><div><h2 data-week-title></h2><p class="muted">Неделя · московское время (МСК)</p></div><div class="calendar-actions"><button type="button" class="secondary-button" data-prev aria-label="Предыдущая неделя">←</button><button type="button" class="secondary-button" data-today>Сегодня</button><button type="button" class="secondary-button" data-next aria-label="Следующая неделя">→</button><label class="calendar-date"><span class="visually-hidden">Перейти к дате</span><input type="date" aria-label="Перейти к дате" data-date></label><button type="button" class="secondary-button" data-refresh>Обновить</button><label class="calendar-full-day"><input type="checkbox" data-full-day>Все 24 часа</label></div></div><p class="status" role="status" data-message></p><div class="calendar-legend"><span class="scheduled">Запланировано</span><span class="past">Прошедшее</span><span class="held">Проведено</span><span class="cancelled">Отменено</span></div><p class="muted calendar-hint">Занятия по 1 часу · Нажмите для отметки проведения и оплаты.</p><div class="calendar-scroll" role="region" aria-label="Недельный календарь занятий, время по Москве" tabindex="0"><div data-grid></div></div><p class="muted" data-count aria-live="polite"></p><dialog class="material-dialog calendar-dialog" aria-labelledby="calendar-lesson-title"><button type="button" class="secondary-button calendar-close" data-close aria-label="Закрыть занятие">✕</button><div data-detail></div></dialog>`
  const grid = root.querySelector<HTMLElement>('[data-grid]')!
  const scroll = root.querySelector<HTMLElement>('.calendar-scroll')!
  const message = root.querySelector<HTMLElement>('[data-message]')!
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!
  const detail = root.querySelector<HTMLElement>('[data-detail]')!
  const dateInput = root.querySelector<HTMLInputElement>('[data-date]')!
  const refresh = root.querySelector<HTMLButtonElement>('[data-refresh]')!

  function draw(): void {
    const today = calendarDate()
    const days = calendarWeek(entries, monday)
    const hours = calendarHours(days, fullDay)
    const hourCount = hours.end - hours.start
    const currentHour = (Date.now() + 3 * 3_600_000) % DAY / 3_600_000
    const position = (minute: number) => `calc(var(--hour-height) * ${(minute / 60 - hours.start)})`
    root.querySelector<HTMLElement>('[data-week-title]')!.textContent = `${dayLabel(monday, { day: 'numeric', month: 'long', year: 'numeric' })} — ${dayLabel(shiftCalendarDate(monday, 6), { day: 'numeric', month: 'long', year: 'numeric' })}`
    dateInput.value = monday
    const count = new Set(days.flatMap(day => day.items.map(item => item.entry.lesson.id))).size
    root.querySelector<HTMLElement>('[data-count]')!.textContent = count ? `Занятий на неделе: ${count}` : 'На этой неделе занятий нет. Можно перейти к другой неделе.'
    grid.innerHTML = `<div class="calendar-grid" style="--visible-hours:${hourCount}"><div class="calendar-corner">МСК</div>${days.map(day => `<div class="calendar-day-heading ${day.date === today ? 'is-today' : ''}"><span>${dayLabel(day.date, { weekday: 'short' })}</span><strong ${day.date === today ? 'aria-current="date"' : ''}>${dayLabel(day.date, { day: 'numeric', month: 'short' })}</strong></div>`).join('')}<div class="calendar-hours">${Array.from({ length: hourCount }, (_, index) => `<span style="top:${position((hours.start + index) * 60)}">${String(hours.start + index).padStart(2, '0')}:00</span>`).join('')}</div>${days.map(day => `<div class="calendar-day ${day.date === today ? 'is-today' : ''}" aria-label="${day.date}">${day.items.map(item => {
      const { entry, start, end, lane, lanes } = item
      const status = lessonStatus(entry.lesson)
      const name = entry.studentName || entry.studentUsername
      return `<button type="button" class="calendar-event ${status.toLowerCase()}" style="top:${position(start)};height:calc(var(--hour-height) * ${(end - start) / 60});left:calc(${lane / lanes * 100}% + 2px);width:calc(${100 / lanes}% - 4px)" data-lesson="${entry.lesson.id}" aria-label="${escape(`${lessonDate(entry.lesson.scheduledAt)}, ${name}, ${entry.lesson.title}, ${statusNames[status]}, ${entry.lesson.paid ? 'оплачено' : 'не оплачено'}`)}"><span class="calendar-event-time">${entry.lesson.scheduledAt.slice(11, 16)} · ${entry.lesson.paid ? '✓ ₽' : '₽ ?'}</span><strong>${escape(name)}</strong><span>${escape(entry.lesson.title)}</span></button>`
    }).join('')}${day.date === today && currentHour >= hours.start && currentHour < hours.end ? `<div class="calendar-now" style="top:${position(currentHour * 60)}" aria-label="Текущее время"></div>` : ''}</div>`).join('')}</div>`
    grid.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => button.addEventListener('click', () => {
      selected = entries.find(entry => entry.lesson.id === Number(button.dataset.lesson))
      drawDetail()
      dialog.showModal()
    }))
  }

  function drawDetail(): void {
    if (!selected) return
    const entry = selected
    detail.innerHTML = `<p class="eyebrow">Занятие · ${escape(entry.academicYear)}</p><h2 id="calendar-lesson-title">${escape(entry.lesson.title)}</h2><p><strong>${escape(entry.studentName || entry.studentUsername)}</strong></p><p>${escape(lessonDate(entry.lesson.scheduledAt))} МСК</p>${entry.lesson.description ? `<p class="calendar-description">${escape(entry.lesson.description)}</p>` : ''}${trackingMarkup(entry.lesson, true)}<p class="status" role="status" data-tracking-message></p><a class="primary-button calendar-course-link" href="/courses/${entry.courseId}?lesson=${entry.lesson.id}">Открыть занятие в курсе →</a>`
    bindLessonManagement(detail, new CourseApi(entry.courseId), entry.lesson, [], async updated => {
      if (!updated) return
      entry.lesson = updated
      draw()
      drawDetail()
    })
  }

  async function load(): Promise<void> {
    refresh.disabled = true
    message.className = 'status'
    message.textContent = 'Загрузка календаря…'
    try {
      const authorization = getAuthorization()
      if (!authorization) throw new Error('Необходимо войти в аккаунт')
      const response = await fetch('/api/schedule', { headers: { Authorization: authorization } })
      if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите снова.' : 'Не удалось загрузить календарь. Нажмите «Обновить».')
      entries = await response.json() as ScheduledLesson[]
      draw()
      message.textContent = ''
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Не удалось загрузить календарь'
    } finally { refresh.disabled = false }
  }

  root.querySelector('[data-prev]')!.addEventListener('click', () => { monday = shiftCalendarDate(monday, -7); draw(); scroll.scrollTop = 0 })
  root.querySelector('[data-next]')!.addEventListener('click', () => { monday = shiftCalendarDate(monday, 7); draw(); scroll.scrollTop = 0 })
  root.querySelector('[data-today]')!.addEventListener('click', () => { monday = calendarMonday(calendarDate()); draw(); scroll.scrollTop = 0; grid.querySelector<HTMLElement>('.calendar-day-heading.is-today')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) })
  dateInput.addEventListener('change', () => { if (dateInput.value && !Number.isNaN(Date.parse(`${dateInput.value}T00:00:00Z`))) { monday = calendarMonday(dateInput.value); draw(); scroll.scrollTop = 0 } })
  root.querySelector<HTMLInputElement>('[data-full-day]')!.addEventListener('change', event => { fullDay = (event.currentTarget as HTMLInputElement).checked; draw(); scroll.scrollTop = 0 })
  refresh.addEventListener('click', () => void load())
  root.querySelector('[data-close]')!.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { grid.querySelector<HTMLButtonElement>(`[data-lesson="${selected?.lesson.id}"]`)?.focus({ preventScroll: true }); selected = undefined })
  const timer = window.setInterval(() => {
    if (!root.isConnected) { window.clearInterval(timer); return }
    if (!dialog.open && !root.contains(document.activeElement)) draw()
  }, 30_000)
  draw()
  scroll.scrollTop = 0
  void load()
}
