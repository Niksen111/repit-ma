import { CourseApi } from './courses-api.ts'

interface TeacherNote { note: string }

export function mountTeacherNote(root: HTMLElement, courseId: number): void {
  const api = new CourseApi(courseId)
  root.innerHTML = '<details class="teacher-note-panel"><summary>Комментарий к ученику</summary><form class="teacher-note"><div class="teacher-note-preview" role="region" aria-label="Комментарий к ученику" tabindex="0" hidden></div><textarea name="note" aria-label="Комментарий к ученику" rows="7" maxlength="10000" disabled hidden></textarea><p class="muted">Личная заметка к этому курсу. Ученик её не видит.</p><div class="teacher-note-actions"><button class="secondary-button" type="button" data-edit disabled>Редактировать</button><button class="secondary-button" type="submit" hidden>Сохранить</button><button class="secondary-button" type="button" data-cancel hidden>Отмена</button><button class="secondary-button" type="button" data-retry hidden>Повторить загрузку</button></div><p class="status" role="status"></p></form></details>'
  const panel = root.querySelector<HTMLDetailsElement>('details')!
  const summary = panel.querySelector<HTMLElement>('summary')!
  const mobile = window.matchMedia('(max-width: 760px)')
  const updatePanel = () => {
    if (!root.isConnected) { mobile.removeEventListener('change', updatePanel); return }
    panel.open = !mobile.matches
    if (mobile.matches) {
      summary.removeAttribute('aria-disabled')
      summary.removeAttribute('tabindex')
    } else {
      summary.setAttribute('aria-disabled', 'true')
      summary.tabIndex = -1
    }
  }
  updatePanel()
  mobile.addEventListener('change', updatePanel)
  summary.addEventListener('click', event => { if (!mobile.matches) event.preventDefault() })
  const form = root.querySelector<HTMLFormElement>('form')!
  const field = form.querySelector<HTMLTextAreaElement>('textarea')!
  const edit = form.querySelector<HTMLButtonElement>('[data-edit]')!
  const save = form.querySelector<HTMLButtonElement>('[type="submit"]')!
  const cancel = form.querySelector<HTMLButtonElement>('[data-cancel]')!
  const retry = form.querySelector<HTMLButtonElement>('[data-retry]')!
  const message = form.querySelector<HTMLElement>('.status')!
  const preview = form.querySelector<HTMLElement>('.teacher-note-preview')!
  let saved = ''
  let editing = false
  let busy = false

  function setEditing(value: boolean): void {
    editing = value
    preview.hidden = value
    field.hidden = !value
    field.disabled = !value
    edit.hidden = value
    save.hidden = !value
    cancel.hidden = !value
    field.value = saved
    if (value) field.focus()
  }

  function showSaved(note: string): void {
    saved = note
    preview.replaceChildren()
    let offset = 0
    for (const match of note.matchAll(/https?:\/\/[^\s<>"']+/g)) {
      preview.append(document.createTextNode(note.slice(offset, match.index)))
      const link = document.createElement('a')
      link.href = match[0]
      link.textContent = match[0]
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      preview.append(link)
      offset = match.index! + match[0].length
    }
    preview.append(document.createTextNode(note.slice(offset)))
    preview.classList.toggle('empty-value', !note)
    if (!note) preview.textContent = 'Комментарий пока не добавлен'
  }

  function report(error: unknown): void {
    message.className = 'status error'
    message.textContent = error instanceof Error ? error.message : 'Не удалось сохранить комментарий'
  }

  async function load(): Promise<void> {
    retry.hidden = true
    message.className = 'status'
    message.textContent = 'Загрузка комментария…'
    try {
      const result = await api.request<TeacherNote>('/teacher-note')
      field.value = result.note
      showSaved(result.note)
      setEditing(false)
      edit.disabled = false
      message.textContent = ''
    } catch (error) { report(error); retry.hidden = false }
  }

  field.addEventListener('input', () => {
    message.className = 'status'
    message.textContent = field.value === saved ? '' : 'Есть несохранённые изменения'
  })
  edit.addEventListener('click', () => {
    message.textContent = ''
    setEditing(true)
  })
  cancel.addEventListener('click', () => {
    message.textContent = ''
    setEditing(false)
    edit.focus()
  })
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (!editing || busy) return
    if (field.value === saved) {
      setEditing(false)
      edit.focus()
      return
    }
    busy = true
    save.disabled = true
    cancel.disabled = true
    field.disabled = true
    message.className = 'status'
    message.textContent = 'Сохранение…'
    try {
      const result = await api.request<TeacherNote>('/teacher-note', 'PUT', { note: field.value })
      showSaved(result.note)
      setEditing(false)
      edit.focus()
      message.textContent = 'Комментарий сохранён'
    } catch (error) { report(error) }
    finally {
      busy = false
      field.disabled = !editing
      save.disabled = false
      cancel.disabled = false
    }
  })
  retry.addEventListener('click', () => void load())
  void load()
}
