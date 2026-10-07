import { getAuthorization } from './auth-api.ts'
import { CourseApi, type ScheduledLesson } from './courses-api.ts'
import { bindLessonManagement, escape, lessonDate, lessonInstant, receiptsMarkup, statusBadge, trackingMarkup } from './lesson-management.ts'

export function mountTeacherSchedule(root: HTMLElement): void {
  let entries: ScheduledLesson[] = []
  let filter = 'past'
  root.innerHTML = '<p class="muted">Время занятий — московское (МСК). Изменения сохраняются сразу.</p><label class="schedule-filter">Показать<select><option value="past">Прошедшие занятия</option><option value="upcoming">Будущие занятия</option><option value="all">Все занятия</option></select></label><p class="status" role="status" id="schedule-message"></p><div id="schedule-table"></div><button class="secondary-button" type="button" id="refresh-schedule">Обновить расписание</button>'
  const table = root.querySelector<HTMLElement>('#schedule-table')!
  const message = root.querySelector<HTMLElement>('#schedule-message')!
  const refreshButton = root.querySelector<HTMLButtonElement>('#refresh-schedule')!

  function draw(): void {
    const now = Date.now()
    const visible = entries.filter(entry => filter === 'all' || (filter === 'past' ? lessonInstant(entry.lesson.scheduledAt) <= now : lessonInstant(entry.lesson.scheduledAt) > now))
    visible.sort((a, b) => filter === 'upcoming' ? a.lesson.scheduledAt.localeCompare(b.lesson.scheduledAt) : b.lesson.scheduledAt.localeCompare(a.lesson.scheduledAt))
    table.innerHTML = visible.length ? `<div class="schedule-table-scroll" role="region" aria-label="Расписание занятий" tabindex="0"><table class="schedule-table"><caption>${filter === 'past' ? 'Прошедшие занятия' : filter === 'upcoming' ? 'Будущие занятия' : 'Все занятия'} · ${visible.length}</caption><thead><tr><th scope="col">Дата и время (МСК)</th><th scope="col">Ученик / занятие</th><th scope="col">Статус и оплата</th><th scope="col">Чеки</th></tr></thead><tbody>${visible.map(entry => `<tr data-schedule-lesson="${entry.lesson.id}"><td><time datetime="${escape(entry.lesson.scheduledAt)}+03:00">${escape(lessonDate(entry.lesson.scheduledAt))}</time></td><td><strong>${escape(entry.studentName ?? entry.studentUsername)}</strong><small>${escape(entry.studentUsername)} · ${escape(entry.academicYear)}</small><a class="schedule-lesson-link" href="/courses/${entry.courseId}?lesson=${entry.lesson.id}">${escape(entry.lesson.title)}</a></td><td>${statusBadge(entry.lesson)}${trackingMarkup(entry.lesson, true)}<p class="status" role="status" data-tracking-message></p></td><td>${receiptsMarkup(entry.receipts, true)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-list"><h2>Занятий пока нет</h2><p>Для выбранного периода занятия не найдены.</p></div>'
    visible.forEach(entry => {
      const row = table.querySelector<HTMLElement>(`[data-schedule-lesson="${entry.lesson.id}"]`)!
      bindLessonManagement(row, new CourseApi(entry.courseId), entry.lesson, entry.receipts, load)
    })
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
    filter = (event.currentTarget as HTMLSelectElement).value
    draw()
  })
  refreshButton.addEventListener('click', () => void load())
  // Recompute automatic statuses when time passes, without interrupting an edit or upload.
  const timer = window.setInterval(() => {
    if (!root.isConnected) { window.clearInterval(timer); return }
    if (!root.contains(document.activeElement) && !root.querySelector('input:disabled, select:disabled, [data-receipt-remove]:disabled')) draw()
  }, 30_000)
  void load()
}
