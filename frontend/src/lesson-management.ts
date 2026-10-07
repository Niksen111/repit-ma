import { CourseApi, type Attachment, type Lesson, type LessonStatus } from './courses-api.ts'

export const escape = (value: string | null): string => (value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
// The stored date is Moscow wall time, regardless of the browser's timezone.
export const lessonInstant = (value: string): number => Date.parse(`${value}+03:00`)
export const lessonDate = (value: string): string => new Date(lessonInstant(value)).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' })
export const statusNames: Record<LessonStatus, string> = { SCHEDULED: 'Запланировано', PAST: 'Прошедшее', HELD: 'Проведено', CANCELLED: 'Отменено' }

export function lessonStatus(lesson: Lesson, now = Date.now()): LessonStatus {
  return lesson.status === 'HELD' || lesson.status === 'CANCELLED' ? lesson.status : lessonInstant(lesson.scheduledAt) > now ? 'SCHEDULED' : 'PAST'
}

export function statusBadge(lesson: Lesson): string {
  const status = lessonStatus(lesson)
  return `<span class="lesson-status ${status.toLowerCase()}">${statusNames[status]}</span>`
}

export function trackingMarkup(lesson: Lesson, teacher: boolean, compact = false): string {
  if (!teacher) return `<div class="lesson-tracking-summary">${statusBadge(lesson)}<span class="payment-status ${lesson.paid ? 'paid' : 'unpaid'}">${lesson.paid ? 'Оплачено' : 'Не оплачено'}</span></div>`
  const automatic = lessonInstant(lesson.scheduledAt) > Date.now() ? 'SCHEDULED' : 'PAST'
  const options = `<option value="AUTO" ${lesson.status === 'SCHEDULED' || lesson.status === 'PAST' ? 'selected' : ''}>${statusNames[automatic]}</option>${automatic === 'PAST' ? `<option value="HELD" ${lesson.status === 'HELD' ? 'selected' : ''}>Проведено</option>` : ''}<option value="CANCELLED" ${lesson.status === 'CANCELLED' ? 'selected' : ''}>Отменено</option>`
  const statusControl = compact
    ? `<select class="lesson-status ${lessonStatus(lesson).toLowerCase()}" aria-label="Статус занятия" data-outcome>${options}</select>`
    : `<label>Статус занятия<select data-outcome>${options}</select></label>`
  return `<div class="lesson-tracking-controls ${compact ? 'compact' : ''}">${statusControl}<label class="payment-toggle ${compact ? `payment-status ${lesson.paid ? 'paid' : 'unpaid'}` : ''}"><input type="checkbox" data-paid ${lesson.paid ? 'checked' : ''}><span>${lesson.paid ? 'Оплачено' : 'Не оплачено'}</span></label></div>`
}

export function receiptsMarkup(receipts: Attachment[], teacher: boolean): string {
  return `<section class="receipt-section"><div class="receipt-heading"><h4>Чеки оплаты${receipts.length ? ` <span class="receipt-count">${receipts.length}</span>` : ''}</h4>${teacher ? '<label class="receipt-upload" title="До 25 МиБ. Чек будет доступен ученику."><span>+ Прикрепить чек</span><input class="visually-hidden" type="file" data-receipt-upload aria-label="Прикрепить чек"></label>' : ''}</div>${receipts.length ? `<ul class="receipt-list">${receipts.map(file => `<li><button type="button" class="file-download" data-receipt-download="${file.id}">${escape(file.originalName)}</button>${teacher ? `<button type="button" class="file-remove" data-receipt-remove="${file.id}" aria-label="Удалить чек ${escape(file.originalName)}">Удалить</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted receipt-empty">Чек пока не прикреплён</p>'}<p class="status" role="status" data-receipt-message></p></section>`
}

export function bindLessonManagement(root: HTMLElement, api: CourseApi, lesson: Lesson, receipts: Attachment[], refresh: () => Promise<void>): void {
  const message = root.querySelector<HTMLElement>('[data-tracking-message]')!
  let busy = false
  async function act(action: () => Promise<void>, target = message): Promise<void> {
    if (busy) return
    busy = true
    const controls = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-outcome], [data-paid], [data-receipt-upload], [data-receipt-remove], [data-receipt-download]')
    controls.forEach(control => { control.disabled = true })
    target.className = 'status'
    target.textContent = 'Сохранение…'
    try {
      await action()
      target.textContent = ''
    } catch (error) {
      target.className = 'status error'
      target.textContent = error instanceof Error ? error.message : 'Не удалось сохранить изменения'
      const outcome = root.querySelector<HTMLSelectElement>('[data-outcome]')
      if (outcome) outcome.value = lesson.status === 'HELD' || lesson.status === 'CANCELLED' ? lesson.status : 'AUTO'
      const paid = root.querySelector<HTMLInputElement>('[data-paid]')
      if (paid) paid.checked = lesson.paid
    } finally {
      controls.forEach(control => { control.disabled = false })
      busy = false
    }
  }
  root.querySelector<HTMLSelectElement>('[data-outcome]')?.addEventListener('change', event => {
    const outcome = (event.currentTarget as HTMLSelectElement).value
    void act(async () => { await api.request(`/lessons/${lesson.id}/tracking`, 'PUT', { outcome }); await refresh() })
  })
  root.querySelector<HTMLInputElement>('[data-paid]')?.addEventListener('change', event => {
    const paid = (event.currentTarget as HTMLInputElement).checked
    void act(async () => { await api.request(`/lessons/${lesson.id}/tracking`, 'PUT', { paid }); await refresh() })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-receipt-download]').forEach(button => button.addEventListener('click', () => {
    const file = receipts.find(item => item.id === Number(button.dataset.receiptDownload))!
    void act(() => api.download('RECEIPT', lesson.id, file), root.querySelector<HTMLElement>('[data-receipt-message]') ?? message)
  }))
  root.querySelectorAll<HTMLButtonElement>('[data-receipt-remove]').forEach(button => button.addEventListener('click', () => {
    if (!confirm('Удалить этот чек?')) return
    void act(async () => { await api.request(api.filesPath('RECEIPT', lesson.id, Number(button.dataset.receiptRemove)), 'DELETE'); await refresh() }, root.querySelector<HTMLElement>('[data-receipt-message]') ?? message)
  }))
  root.querySelector<HTMLInputElement>('[data-receipt-upload]')?.addEventListener('change', event => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    void act(async () => { await api.upload('RECEIPT', lesson.id, file); input.value = ''; await refresh() }, root.querySelector<HTMLElement>('[data-receipt-message]') ?? message)
  })
}
