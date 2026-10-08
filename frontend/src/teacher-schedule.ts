import { getAuthorization } from './auth-api.ts'
import { CourseApi, type ScheduledLesson } from './courses-api.ts'
import { bindLessonManagement, escape, lessonDate, lessonInstant, receiptsMarkup, trackingMarkup } from './lesson-management.ts'
import { lessonPage } from './lesson-navigation.ts'

type ScheduleFilter = 'past' | 'upcoming' | 'all'

export function schedulePage(entries: ScheduledLesson[], filter: ScheduleFilter, page: number, now = Date.now()) {
  const filtered = entries.filter(entry => filter === 'all' || (filter === 'past' ? lessonInstant(entry.lesson.scheduledAt) <= now : lessonInstant(entry.lesson.scheduledAt) > now))
  filtered.sort((a, b) => filter === 'upcoming' ? a.lesson.scheduledAt.localeCompare(b.lesson.scheduledAt) : b.lesson.scheduledAt.localeCompare(a.lesson.scheduledAt))
  return { ...lessonPage(filtered, page), total: filtered.length }
}

export function mountTeacherSchedule(root: HTMLElement): void {
  let entries: ScheduledLesson[] = []
  let filter: ScheduleFilter = 'past'
  let page = 1
  root.innerHTML = '<p class="muted">Время занятий — московское (МСК). Изменения сохраняются сразу.</p><label class="schedule-filter">Показать<select><option value="past">Прошедшие занятия</option><option value="upcoming">Будущие занятия</option><option value="all">Все занятия</option></select></label><p class="status" role="status" id="schedule-message"></p><div id="schedule-table"></div><button class="secondary-button" type="button" id="refresh-schedule">Обновить расписание</button>'
  const table = root.querySelector<HTMLElement>('#schedule-table')!
  const message = root.querySelector<HTMLElement>('#schedule-message')!
  const refreshButton = root.querySelector<HTMLButtonElement>('#refresh-schedule')!

  function draw(): void {
    const visible = schedulePage(entries, filter, page)
    page = visible.page
    const pagination = (position: string) => visible.totalPages > 1 ? `<nav class="lesson-pagination schedule-pagination" aria-label="Страницы расписания" data-pagination="${position}"><button type="button" class="secondary-button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница расписания">← Назад</button><label><span class="visually-hidden">Страница расписания</span><select data-page-select>${Array.from({ length: visible.totalPages }, (_, index) => `<option value="${index + 1}" ${page === index + 1 ? 'selected' : ''}>${index + 1} из ${visible.totalPages}</option>`).join('')}</select></label><button type="button" class="secondary-button" data-page="${page + 1}" ${page === visible.totalPages ? 'disabled' : ''} aria-label="Следующая страница расписания">Далее →</button></nav>` : ''
    table.innerHTML = visible.total ? `${pagination('top')}<div class="schedule-table-scroll" role="region" aria-label="Расписание занятий" tabindex="0"><table class="schedule-table"><caption>${filter === 'past' ? 'Прошедшие занятия' : filter === 'upcoming' ? 'Будущие занятия' : 'Все занятия'} · ${visible.start}–${visible.end} из ${visible.total}</caption><thead><tr><th scope="col">Дата и время (МСК)</th><th scope="col">Ученик / занятие</th><th scope="col">Статус и оплата</th><th scope="col">Чеки</th></tr></thead><tbody>${visible.items.map(entry => `<tr data-schedule-lesson="${entry.lesson.id}"><td><time datetime="${escape(entry.lesson.scheduledAt)}+03:00">${escape(lessonDate(entry.lesson.scheduledAt))}</time></td><td><strong>${escape(entry.studentName ?? entry.studentUsername)}</strong><small>${escape(entry.studentUsername)} · ${escape(entry.academicYear)}</small><a class="schedule-lesson-link" href="/courses/${entry.courseId}?lesson=${entry.lesson.id}">${escape(entry.lesson.title)}</a>${entry.lesson.recurringScheduleId ? '<small class="lesson-series-label">По недельному расписанию</small>' : ''}</td><td>${trackingMarkup(entry.lesson, true, true)}<p class="status" role="status" data-tracking-message></p></td><td>${receiptsMarkup(entry.receipts, true)}</td></tr>`).join('')}</tbody></table></div>${pagination('bottom')}` : '<div class="empty-list"><h2>Занятий пока нет</h2><p>Для выбранного периода занятия не найдены.</p></div>'
    visible.items.forEach(entry => {
      const row = table.querySelector<HTMLElement>(`[data-schedule-lesson="${entry.lesson.id}"]`)!
      bindLessonManagement(row, new CourseApi(entry.courseId), entry.lesson, entry.receipts, load)
    })
    table.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => button.addEventListener('click', () => {
      page = Number(button.dataset.page)
      draw()
      table.querySelector<HTMLSelectElement>('[data-pagination="top"] [data-page-select]')!.focus({ preventScroll: true })
      table.scrollIntoView({ block: 'start' })
    }))
    table.querySelectorAll<HTMLSelectElement>('[data-page-select]').forEach(select => select.addEventListener('change', () => {
      page = Number(select.value)
      draw()
      table.querySelector<HTMLSelectElement>('[data-pagination="top"] [data-page-select]')!.focus({ preventScroll: true })
      table.scrollIntoView({ block: 'start' })
    }))
  }

  async function load(): Promise<void> {
    refreshButton.disabled = true
    message.textContent = 'Загрузка расписания…'
    message.className = 'status'
    try {
      const authorization = getAuthorization()
      if (!authorization) throw new Error('Необходимо войти в аккаунт')
      const response = await fetch('/api/schedule', { headers: { Authorization: authorization } })
      if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите снова.' : 'Не удалось загрузить расписание. Попробуйте обновить его.')
      entries = await response.json() as ScheduledLesson[]
      draw()
      message.textContent = ''
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Не удалось загрузить расписание'
    } finally { refreshButton.disabled = false }
  }
  root.querySelector<HTMLSelectElement>('.schedule-filter select')!.addEventListener('change', event => {
    filter = (event.currentTarget as HTMLSelectElement).value as ScheduleFilter
    page = 1
    draw()
  })
  refreshButton.addEventListener('click', () => void load())
  // Recompute automatic statuses when time passes, without interrupting an edit or upload.
  const timer = window.setInterval(() => {
    if (!root.isConnected) { window.clearInterval(timer); return }
    if (!refreshButton.disabled && !root.contains(document.activeElement) && !root.querySelector('input:disabled, select:disabled, [data-receipt-remove]:disabled')) draw()
  }, 30_000)
  void load()
}
