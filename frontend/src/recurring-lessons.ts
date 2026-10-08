import { CourseApi, type Lesson, type RecurringLessonSchedule, type RecurringLessonSlot } from './courses-api.ts'
import { escape } from './lesson-management.ts'

const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const shortDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const today = (): string => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
const dateLabel = (value: string): string => new Date(`${value}T00:00:00+03:00`).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'medium' })

export function recurringScheduleMarkup(schedule: RecurringLessonSchedule): string {
  const ended = schedule.endDate !== null && schedule.endDate < today()
  const active = schedule.active && !ended
  const status = ended ? 'Завершено' : active ? 'Действует' : 'Остановлено'
  return `<article class="recurring-card ${active ? '' : 'inactive'}" data-recurring-id="${schedule.id}"><div class="recurring-card-heading"><strong>${escape(schedule.title)}</strong><span class="recurring-state ${active ? 'active' : ''}">${status}</span></div><div class="recurring-slots">${schedule.slots.map(slot => `<span>${shortDays[slot.dayOfWeek - 1]} <b>${escape(slot.startTime)}</b></span>`).join('')}<small>МСК</small></div><div class="recurring-card-footer"><small>С ${escape(dateLabel(schedule.startDate))}${schedule.endDate ? ` по ${escape(dateLabel(schedule.endDate))}` : ''}</small>${ended ? '' : `<button type="button" class="${active ? 'recurring-stop' : 'recurring-resume'}" data-toggle-recurring>${active ? 'Остановить расписание' : 'Возобновить'}</button>`}</div></article>`
}

export function mountLessonScheduling(root: HTMLElement, courseId: number, options: { onCreateOneOff?: () => void; onChanged?: () => Promise<void> } = {}): void {
  const api = new CourseApi(courseId)
  let schedules: RecurringLessonSchedule[] = []
  let busy = false
  root.innerHTML = `<div class="student-lesson-actions"><button type="button" class="primary-button" data-add-recurring aria-label="Настроить расписание" disabled>Расписание</button><button type="button" class="secondary-button" data-add-oneoff aria-label="Создать разовое занятие">Разовое занятие</button></div><p class="status" data-scheduling-message role="status"></p><div class="recurring-list"><p class="muted">Загрузка расписаний…</p></div><dialog class="material-dialog recurring-dialog"><form><h2></h2><div class="recurring-editor-fields"></div><p class="status error" role="status"></p><div class="form-actions"><button class="primary-button" type="submit">Сохранить</button><button class="secondary-button" type="button" data-close-scheduling>Отмена</button></div></form></dialog>`
  const list = root.querySelector<HTMLElement>('.recurring-list')!
  const message = root.querySelector<HTMLElement>('[data-scheduling-message]')!
  const createButton = root.querySelector<HTMLButtonElement>('[data-add-recurring]')!
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!
  const form = dialog.querySelector<HTMLFormElement>('form')!
  const fields = form.querySelector<HTMLElement>('.recurring-editor-fields')!
  const formMessage = form.querySelector<HTMLElement>('.status')!
  let save: ((data: FormData) => Promise<void>) | null = null

  function report(error: unknown, target = message): void {
    target.className = 'status error'
    target.textContent = error instanceof Error ? error.message : 'Не удалось выполнить действие'
  }

  function open(title: string, content: string, action: (data: FormData) => Promise<void>, submitLabel = 'Сохранить'): void {
    form.querySelector('h2')!.textContent = title
    form.querySelector<HTMLButtonElement>('[type="submit"]')!.textContent = submitLabel
    fields.innerHTML = content
    formMessage.textContent = ''
    message.textContent = ''
    save = action
    if (!dialog.open) dialog.showModal()
  }
  root.querySelector('[data-close-scheduling]')!.addEventListener('click', () => { if (!busy) dialog.close() })
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault() })
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (busy || !save) return
    const data = new FormData(form)
    busy = true
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input, button, select, textarea').forEach(control => { control.disabled = true })
    formMessage.textContent = ''
    try { await save(data); dialog.close() } catch (error) { report(error, formMessage) }
    finally {
      busy = false
      form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input, button, select, textarea').forEach(control => { control.disabled = false })
      if (fields.querySelector('[data-weekly-slots]')) updateSlotButtons()
    }
  })

  function draw(): void {
    list.innerHTML = schedules.map(recurringScheduleMarkup).join('')
    schedules.forEach(schedule => list.querySelector<HTMLButtonElement>(`[data-recurring-id="${schedule.id}"] [data-toggle-recurring]`)?.addEventListener('click', () => {
      if (schedule.active) {
        open('Остановить расписание', `<p class="muted">Новые занятия по этому расписанию больше не будут появляться.</p><label class="cancel-upcoming-option"><input type="checkbox" name="cancelUpcoming"><span>Также отменить уже созданные будущие занятия этого расписания<small>Отменённые занятия останутся в истории.</small></span></label>`, async data => {
          await toggle(schedule, false, data.get('cancelUpcoming') === 'on')
        }, 'Остановить расписание')
      } else {
        open('Возобновить расписание', '<p class="muted">Занятия будут снова автоматически появляться на ближайшую неделю.</p>', async () => {
          await toggle(schedule, true)
        }, 'Возобновить')
      }
    }))
  }

  async function toggle(schedule: RecurringLessonSchedule, active: boolean, cancelUpcoming = false): Promise<void> {
    const saved = await api.request<RecurringLessonSchedule>(`/recurring-lessons/${schedule.id}/active`, 'PUT', { active, cancelUpcoming })
    schedules = schedules.map(item => item.id === saved.id ? saved : item)
    draw()
    message.className = 'status notice'
    message.textContent = active ? 'Расписание возобновлено' : 'Расписание остановлено'
    await options.onChanged?.()
  }

  function addSlot(slot?: RecurringLessonSlot): void {
    const container = fields.querySelector<HTMLElement>('[data-weekly-slots]')!
    if (container.children.length >= 21) return
    const row = document.createElement('div')
    row.className = 'weekly-slot-row'
    row.innerHTML = `<label>День недели<select name="dayOfWeek">${weekdays.map((day, index) => `<option value="${index + 1}"${slot?.dayOfWeek === index + 1 ? ' selected' : ''}>${day}</option>`).join('')}</select></label><label>Время (МСК)<input type="time" name="startTime" value="${escape(slot?.startTime ?? '')}" step="60" required></label><button type="button" class="remove-weekly-slot" aria-label="Удалить время занятия">×</button>`
    container.append(row)
    row.querySelector('button')!.addEventListener('click', () => {
      if (container.children.length > 1) row.remove()
      updateSlotButtons()
    })
    updateSlotButtons()
  }

  function updateSlotButtons(): void {
    const container = fields.querySelector<HTMLElement>('[data-weekly-slots]')!
    container.querySelectorAll<HTMLButtonElement>('.remove-weekly-slot').forEach(button => { button.disabled = container.children.length === 1 })
    fields.querySelector<HTMLButtonElement>('[data-add-slot]')!.disabled = container.children.length >= 21
  }

  function scheduleEditor(schedule?: RecurringLessonSchedule): void {
    const selector = schedules.length ? `<label>Расписание<select data-schedule-choice>${schedules.map(item => {
      const times = item.slots.map(slot => `${shortDays[slot.dayOfWeek - 1]} ${slot.startTime}`).join(', ')
      const state = item.endDate !== null && item.endDate < today() ? 'Завершено' : item.active ? 'Действует' : 'Остановлено'
      return `<option value="${item.id}"${item.id === schedule?.id ? ' selected' : ''}>${escape(`${item.title} · ${times} · ${state}`)}</option>`
    }).join('')}<option value="new"${schedule ? '' : ' selected'}>Создать новое расписание</option></select></label>` : ''
    const hint = schedule ? 'Изменения применятся к дальнейшей генерации. Уже созданные занятия сохранят свои даты, материалы, статусы и оплату; при необходимости измените их отдельно.' : 'Выберите дни и время. Занятия будут автоматически появляться на неделю вперёд.'
    const stateHint = schedule && !schedule.active ? '<p class="muted">Расписание остановлено. Сохранение не возобновит генерацию занятий.</p>' : ''
    open(schedule ? 'Редактировать расписание' : 'Новое расписание', `${selector}<p class="muted">${hint}</p>${stateHint}<div data-weekly-slots></div><button type="button" class="secondary-button" data-add-slot>+ Добавить день и время</button><div class="lesson-schedule-fields"><label>Дата начала<input type="date" name="startDate" value="${escape(schedule?.startDate ?? today())}" required></label><label>Дата окончания (необязательно)<input type="date" name="endDate" value="${escape(schedule?.endDate ?? '')}"></label></div><label>Название занятий<input name="title" maxlength="200" required value="${escape(schedule?.title ?? 'Занятие по расписанию')}"></label><label>Описание<textarea name="description" maxlength="10000" rows="2">${escape(schedule ? schedule.description : 'Регулярное занятие по недельному расписанию.')}</textarea></label>`, async data => {
      const days = data.getAll('dayOfWeek')
      const times = data.getAll('startTime')
      const slots: RecurringLessonSlot[] = days.map((day, index) => ({ dayOfWeek: Number(day), startTime: String(times[index]) }))
      const saved = await api.request<RecurringLessonSchedule>(schedule ? `/recurring-lessons/${schedule.id}` : '/recurring-lessons', schedule ? 'PUT' : 'POST', {
        slots, startDate: String(data.get('startDate')), endDate: String(data.get('endDate') ?? '') || null,
        title: String(data.get('title')).trim(), description: String(data.get('description') ?? '').trim() || null,
      })
      if (schedule) schedules = schedules.map(item => item.id === saved.id ? saved : item)
      else schedules.unshift(saved)
      draw()
      message.className = 'status notice'
      message.textContent = schedule ? 'Расписание обновлено' : 'Расписание сохранено. Занятия будут появляться на неделю вперёд.'
      await options.onChanged?.()
    })
    fields.querySelector('[data-add-slot]')!.addEventListener('click', () => addSlot())
    if (schedule) schedule.slots.forEach(slot => addSlot(slot))
    else addSlot()
    fields.querySelector<HTMLSelectElement>('[data-schedule-choice]')?.addEventListener('change', event => {
      const selectedId = (event.currentTarget as HTMLSelectElement).value
      scheduleEditor(schedules.find(item => String(item.id) === selectedId))
    })
  }

  createButton.addEventListener('click', () => {
    const current = schedules.find(item => item.active && (item.endDate === null || item.endDate >= today())) ?? schedules[0]
    scheduleEditor(current)
  })

  root.querySelector('[data-add-oneoff]')?.addEventListener('click', () => {
    if (options.onCreateOneOff) { options.onCreateOneOff(); return }
    open('Разовое занятие', `<label>Название<input name="title" maxlength="200" required value="Занятие"></label><div class="lesson-schedule-fields"><label>Дата занятия<input type="date" name="scheduledDate" value="${today()}" required></label><label>Время (МСК)<input type="time" name="scheduledTime" step="60" required></label></div><label>Описание<textarea name="description" maxlength="10000" rows="3"></textarea></label>`, async data => {
      const lesson = await api.request<Lesson>('/lessons', 'POST', {
        title: String(data.get('title')).trim(), description: String(data.get('description') ?? '').trim() || null,
        scheduledAt: `${data.get('scheduledDate')}T${data.get('scheduledTime')}:00`,
      })
      message.className = 'status notice'
      message.replaceChildren('Разовое занятие создано. ')
      const link = document.createElement('a')
      link.href = `/courses/${courseId}?lesson=${lesson.id}`
      link.textContent = 'Открыть занятие'
      message.append(link)
      await options.onChanged?.()
    }, 'Создать занятие')
  })

  async function load(): Promise<void> {
    createButton.disabled = true
    message.textContent = ''
    try {
      schedules = await api.request<RecurringLessonSchedule[]>('/recurring-lessons')
      draw()
      createButton.disabled = false
    } catch (error) {
      report(error)
      list.innerHTML = '<button type="button" class="secondary-button">Повторить загрузку расписаний</button>'
      list.querySelector('button')!.addEventListener('click', () => void load())
    }
  }
  void load()
}
