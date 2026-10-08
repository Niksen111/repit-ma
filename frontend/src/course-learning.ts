import { type Profile } from './auth-api.ts'
import { CourseApi, type Attachment, type Lesson, type OwnerType, type Solution, type Task } from './courses-api.ts'
import { bindLessonManagement, lessonDate, lessonStatus, receiptsMarkup, statusBadge, trackingMarkup } from './lesson-management.ts'
import { mountLessonScheduling } from './recurring-lessons.ts'
import { lessonPage, pageForLesson, selectLesson } from './lesson-navigation.ts'

const escape = (value: string | null): string => (value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const description = (value: string | null): string => value ? `<p class="material-description">${escape(value)}</p>` : ''
const date = (value: string): string => new Date(value).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })

export function mountCourseLearning(root: HTMLElement, profile: Profile, courseId: number): void {
  const api = new CourseApi(courseId)
  const teacher = profile.role === 'TEACHER' || profile.role === 'ADMIN'
  let lessons: Lesson[] = []
  let selected: number | null = Number(new URLSearchParams(window.location.search).get('lesson')) || null
  let page = 1
  let revision = 0

  root.innerHTML = `<div class="materials-heading"><h2>Занятия</h2></div><div class="lesson-navigation"><details class="lesson-picker" id="lesson-picker"><summary>Выбрать занятие <span data-lesson-count></span></summary><div id="lesson-list"></div></details>${teacher ? '<details class="lesson-scheduling-picker"><summary>Расписание и новые занятия</summary><section class="course-scheduling" data-course-scheduling></section></details>' : ''}</div><p class="status" id="learning-message" role="status"></p><div id="lesson-detail" tabindex="-1" aria-live="polite"></div><dialog class="material-dialog"><form id="material-editor"><h2></h2><div id="editor-fields"></div><p class="status error" role="status"></p><div class="form-actions"><button class="primary-button" type="submit">Сохранить</button><button class="secondary-button" type="button" id="close-editor">Отмена</button></div></form></dialog>`
  const picker = root.querySelector<HTMLDetailsElement>('#lesson-picker')!
  const list = root.querySelector<HTMLElement>('#lesson-list')!
  const detail = root.querySelector<HTMLElement>('#lesson-detail')!
  const message = root.querySelector<HTMLElement>('#learning-message')!
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!
  const editor = dialog.querySelector<HTMLFormElement>('form')!
  let saveEditor: ((data: FormData) => Promise<void>) | null = null

  function report(error: unknown, target = message): void {
    target.className = 'status error'
    target.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
  }

  async function act(button: HTMLButtonElement, action: () => Promise<void>, target = message): Promise<void> {
    button.disabled = true
    target.textContent = ''
    try { await action() } catch (error) { report(error, target) } finally { button.disabled = false }
  }

  function openEditor(title: string, fields: string, save: (data: FormData) => Promise<void>): void {
    editor.querySelector('h2')!.textContent = title
    editor.querySelector('#editor-fields')!.innerHTML = fields
    editor.querySelector('.status')!.textContent = ''
    saveEditor = save
    dialog.showModal()
  }
  root.querySelector('#close-editor')!.addEventListener('click', () => dialog.close())
  editor.addEventListener('submit', event => {
    event.preventDefault()
    void act(editor.querySelector<HTMLButtonElement>('[type="submit"]')!, async () => {
      await saveEditor!(new FormData(editor))
      dialog.close()
    }, editor.querySelector<HTMLElement>('.status')!)
  })
  const textFields = (item?: { title: string; description: string | null }): string => `<label>Название<input name="title" maxlength="200" required value="${escape(item?.title ?? '')}"></label><label>Описание<textarea name="description" maxlength="10000" rows="5">${escape(item?.description ?? '')}</textarea></label>`
  const textData = (data: FormData) => ({ title: String(data.get('title')).trim(), description: String(data.get('description') ?? '').trim() || null })

  function lessonEditor(lesson?: Lesson): void {
    const now = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const pad = (value: number) => String(value).padStart(2, '0')
    const scheduledDate = lesson?.scheduledAt.slice(0, 10) ?? `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`
    const scheduledTime = lesson?.scheduledAt.slice(11, 16) ?? ''
    openEditor(lesson ? 'Редактировать занятие' : 'Новое занятие', textFields(lesson) + `<div class="lesson-schedule-fields"><label>Дата занятия<input type="date" name="scheduledDate" required value="${escape(scheduledDate)}"></label><label>Время занятия (МСК)<input type="time" name="scheduledTime" step="60" required value="${escape(scheduledTime)}"></label></div>`, async data => {
      const scheduledAt = `${data.get('scheduledDate')}T${String(data.get('scheduledTime')).slice(0, 5)}:00`
      const saved = await api.request<Lesson>(lesson ? `/lessons/${lesson.id}` : '/lessons', lesson ? 'PUT' : 'POST', { ...textData(data), scheduledAt })
      selected = saved.id
      await loadLessons()
    })
  }

  function drawList(): void {
    const visible = lessonPage(lessons, page)
    page = visible.page
    picker.querySelector('[data-lesson-count]')!.textContent = lessons.length ? `(${lessons.length})` : ''
    picker.hidden = lessons.length === 0
    if (!lessons.length) {
      list.innerHTML = ''
      return
    }
    list.innerHTML = `<p class="muted lesson-list-count" role="status">Занятия ${visible.start}–${visible.end} из ${lessons.length}</p><div class="lesson-rows">${visible.items.map(lesson => `<button type="button" class="lesson-row ${selected === lesson.id ? 'selected' : ''}" data-lesson="${lesson.id}" aria-pressed="${selected === lesson.id}"><span>${escape(lesson.title)}</span><time datetime="${escape(lesson.scheduledAt)}+03:00">${escape(lessonDate(lesson.scheduledAt))} МСК</time>${statusBadge(lesson)}${lesson.recurringScheduleId ? '<small class="lesson-series-label">По недельному расписанию</small>' : ''}</button>`).join('')}</div>${visible.totalPages > 1 ? `<nav class="lesson-pagination" aria-label="Страницы занятий"><button type="button" class="secondary-button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница занятий">← Назад</button><label><span class="visually-hidden">Страница занятий</span><select data-page-select>${Array.from({ length: visible.totalPages }, (_, index) => `<option value="${index + 1}" ${page === index + 1 ? 'selected' : ''}>${index + 1} из ${visible.totalPages}</option>`).join('')}</select></label><button type="button" class="secondary-button" data-page="${page + 1}" ${page === visible.totalPages ? 'disabled' : ''} aria-label="Следующая страница занятий">Далее →</button></nav>` : ''}`
    list.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => button.addEventListener('click', () => {
      selected = Number(button.dataset.lesson)
      drawList()
      picker.open = false
      detail.focus({ preventScroll: true })
      detail.scrollIntoView({ block: 'start' })
      void loadDetail()
    }))
    list.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => button.addEventListener('click', () => {
      const direction = Number(button.dataset.page) < page ? -1 : 1
      page = Number(button.dataset.page)
      drawList()
      const next = list.querySelector<HTMLButtonElement>(`[data-page="${page + direction}"]`)
      if (next && !next.disabled) next.focus()
      else list.querySelector<HTMLSelectElement>('[data-page-select]')?.focus()
    }))
    list.querySelector<HTMLSelectElement>('[data-page-select]')?.addEventListener('change', event => {
      page = Number((event.currentTarget as HTMLSelectElement).value)
      drawList()
      list.querySelector<HTMLSelectElement>('[data-page-select]')!.focus()
    })
  }
  picker.addEventListener('toggle', () => {
    if (picker.open && !list.querySelector('[data-retry-lessons]')) { page = pageForLesson(lessons, selected); drawList() }
  })

  async function loadLessons(): Promise<void> {
    try {
      lessons = await api.request<Lesson[]>('/lessons')
      lessons.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      selected = selectLesson(lessons, selected)
      page = pageForLesson(lessons, selected)
      message.textContent = ''
      drawList()
      await loadDetail()
    } catch (error) {
      report(error)
      picker.hidden = false
      picker.open = true
      list.innerHTML = '<button class="secondary-button" type="button" data-retry-lessons>Повторить загрузку</button>'
      list.querySelector('button')!.addEventListener('click', () => { message.textContent = ''; void loadLessons() })
    }
  }

  function filesMarkup(files: Attachment[], type: OwnerType, ownerId: number, editable: boolean): string {
    return `<section class="attachment-section" data-owner="${type}" data-owner-id="${ownerId}"><h4>${type === 'LESSON' ? 'Материалы занятия' : type === 'TASK' ? 'Файлы задания' : 'Файлы решения'}</h4><ul class="attachment-list">${files.map(file => `<li><button class="file-download" type="button" data-download="${file.id}">${escape(file.originalName)}</button>${editable ? `<button class="file-remove" type="button" data-remove="${file.id}" aria-label="Удалить файл ${escape(file.originalName)}">Удалить</button>` : ''}</li>`).join('')}</ul>${files.length ? '' : '<p class="muted">Файлов пока нет</p>'}${editable ? '<label class="upload-label">Добавить файлы<input type="file" multiple><small>До 25 МиБ каждый. Изображения и документы.</small></label>' : ''}<p class="status" role="status"></p></section>`
  }

  async function loadDetail(): Promise<void> {
    const version = ++revision
    const lesson = lessons.find(item => item.id === selected)
    if (!lesson) {
      detail.innerHTML = `<div class="empty-list"><h3>Занятий пока нет</h3><p>${teacher ? 'Добавьте первое занятие через «Расписание и новые занятия», затем прикрепите теорию и домашнее задание.' : 'Здесь появятся занятия и материалы от преподавателя.'}</p></div>`
      return
    }
    detail.innerHTML = '<p class="status">Загрузка материалов…</p>'
    try {
      const [files, tasks, receipts] = await Promise.all([
        api.request<Attachment[]>(api.filesPath('LESSON', lesson.id)),
        api.request<Task[]>(`/lessons/${lesson.id}/tasks`),
        api.request<Attachment[]>(api.filesPath('RECEIPT', lesson.id)),
      ])
      const taskDetails = await Promise.all(tasks.map(async task => {
        const [taskFiles, solution] = await Promise.all([
          api.request<Attachment[]>(api.filesPath('TASK', task.id)),
          api.request<Solution | null>(`/tasks/${task.id}/solution`),
        ])
        const solutionFiles = solution ? await api.request<Attachment[]>(api.filesPath('SOLUTION', solution.id)) : []
        return { task, taskFiles, solution, solutionFiles }
      }))
      if (version !== revision) return
      detail.innerHTML = `<article class="lesson-card" data-lesson-management><div class="materials-heading"><h2>${escape(lesson.title)}</h2>${teacher ? '<div class="material-actions"><button type="button" class="secondary-button" id="edit-lesson">Редактировать</button><button type="button" class="danger-button" id="delete-lesson">Удалить</button></div>' : ''}</div><div class="lesson-meta"><time class="muted" datetime="${escape(lesson.scheduledAt)}+03:00">${escape(lessonDate(lesson.scheduledAt))} МСК</time>${trackingMarkup(lesson, teacher, true)}${lesson.recurringScheduleId ? '<span class="lesson-series-label">По недельному расписанию</span>' : ''}</div><p class="status" role="status" data-tracking-message></p>${description(lesson.description)}${filesMarkup(files, 'LESSON', lesson.id, teacher)}${receiptsMarkup(receipts, teacher)}<div class="materials-heading homework-heading"><h3>Домашние задания</h3>${teacher ? '<button class="secondary-button" type="button" id="add-task">Добавить домашку</button>' : ''}</div>${tasks.length ? '' : '<p class="muted">Домашних заданий пока нет</p>'}<div id="homework-list">${taskDetails.map(({ task, taskFiles, solution, solutionFiles }) => {
        const editable = profile.role === 'STUDENT' && (solution === null || solution.grade === null)
        const status = !solution ? 'Не отправлено' : solution.grade === null ? 'Ожидает проверки' : solution.grade ? 'Зачёт' : 'Незачёт'
        return `<article class="homework-card" data-task="${task.id}"><div class="materials-heading"><h3>${escape(task.title)}</h3>${teacher ? '<div class="material-actions"><button class="secondary-button" type="button" data-edit-task>Редактировать</button><button class="danger-button" type="button" data-delete-task>Удалить</button></div>' : ''}</div>${description(task.description)}${filesMarkup(taskFiles, 'TASK', task.id, teacher)}<section class="solution-section"><div class="materials-heading"><h4>Решение</h4><span class="grade-badge ${solution?.grade === true ? 'passed' : solution?.grade === false ? 'failed' : ''}">${status}</span></div>${description(solution?.description ?? null)}${solution ? filesMarkup(solutionFiles, 'SOLUTION', solution.id, editable) : ''}${solution?.teacherComment ? `<div class="teacher-comment"><h4>Комментарий преподавателя</h4>${description(solution.teacherComment)}</div>` : ''}${solution?.gradedAt ? `<p class="muted">Проверено: ${escape(date(solution.gradedAt))}</p>` : ''}${editable ? `<button class="primary-button" type="button" data-solution>${solution ? 'Редактировать решение' : 'Отправить решение'}</button>${!solution ? '<p class="muted">Можно отправить ответ текстом или сохранить решение и прикрепить файлы.</p>' : ''}` : profile.role === 'STUDENT' ? '<p class="muted">Решение оценено. Редактирование закрыто.</p>' : ''}${teacher && solution ? '<button class="primary-button" type="button" data-grade>Оценить решение</button>' : ''}</section><p class="status" role="status" data-task-message></p></article>`
      }).join('')}</div><p class="status" role="status" id="detail-message"></p></article>`
      const detailMessage = detail.querySelector<HTMLElement>('#detail-message')!
      bindLessonManagement(detail.querySelector<HTMLElement>('[data-lesson-management]')!, api, lesson, receipts, loadLessons)
      detail.querySelector('#edit-lesson')?.addEventListener('click', () => lessonEditor(lesson))
      detail.querySelector<HTMLButtonElement>('#delete-lesson')?.addEventListener('click', event => {
        if (!confirm('Удалить занятие вместе со всеми домашками, решениями и файлами?')) return
        void act(event.currentTarget as HTMLButtonElement, async () => { await api.request(`/lessons/${lesson.id}`, 'DELETE'); await loadLessons() }, detailMessage)
      })
      const taskEditor = (task?: Task) => openEditor(task ? 'Редактировать домашку' : 'Новая домашка', textFields(task), async data => {
        await api.request(task ? `/tasks/${task.id}` : `/lessons/${lesson.id}/tasks`, task ? 'PUT' : 'POST', textData(data))
        await loadDetail()
      })
      detail.querySelector('#add-task')?.addEventListener('click', () => taskEditor())
      taskDetails.forEach(({ task, solution }) => {
        const card = detail.querySelector<HTMLElement>(`[data-task="${task.id}"]`)!
        card.querySelector('[data-edit-task]')?.addEventListener('click', () => taskEditor(task))
        card.querySelector('[data-delete-task]')?.addEventListener('click', event => {
          if (!confirm('Удалить домашнее задание вместе с решением и файлами?')) return
          void act(event.currentTarget as HTMLButtonElement, async () => { await api.request(`/tasks/${task.id}`, 'DELETE'); await loadDetail() }, card.querySelector<HTMLElement>('[data-task-message]')!)
        })
        card.querySelector('[data-solution]')?.addEventListener('click', () => openEditor(solution ? 'Редактировать решение' : 'Отправить решение', `<label>Ответ / описание (необязательно)<textarea name="description" maxlength="10000" rows="6">${escape(solution?.description ?? '')}</textarea></label><p class="muted">После сохранения можно прикрепить файлы. До оценки ответ и файлы можно менять.</p>`, async data => {
          await api.request(solution ? `/solutions/${solution.id}` : `/tasks/${task.id}/solution`, solution ? 'PUT' : 'POST', { description: String(data.get('description') ?? '').trim() || null })
          await loadDetail()
        }))
        card.querySelector('[data-grade]')?.addEventListener('click', () => openEditor('Проверка решения', `<label>Оценка<select name="grade" required><option value="" ${solution?.grade === null ? 'selected' : ''} disabled>Выберите оценку</option><option value="true" ${solution?.grade === true ? 'selected' : ''}>Зачёт</option><option value="false" ${solution?.grade === false ? 'selected' : ''}>Незачёт</option></select></label><label>Комментарий<textarea name="teacherComment" maxlength="10000" rows="5">${escape(solution?.teacherComment ?? '')}</textarea></label><p class="muted">Любая оценка закрывает редактирование решения ученику.</p>`, async data => {
          await api.request(`/solutions/${solution!.id}/grade`, 'PUT', { grade: data.get('grade') === 'true', teacherComment: String(data.get('teacherComment') ?? '').trim() || null })
          await loadDetail()
        }))
      })
      const attachments = new Map<string, Attachment[]>([[`LESSON:${lesson.id}`, files]])
      taskDetails.forEach(({ task, taskFiles, solution, solutionFiles }) => {
        attachments.set(`TASK:${task.id}`, taskFiles)
        if (solution) attachments.set(`SOLUTION:${solution.id}`, solutionFiles)
      })
      detail.querySelectorAll<HTMLElement>('[data-owner]').forEach(section => {
        const type = section.dataset.owner as OwnerType
        const ownerId = Number(section.dataset.ownerId)
        const status = section.querySelector<HTMLElement>('.status')!
        section.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => button.addEventListener('click', () => {
          void act(button, () => api.download(type, ownerId, attachments.get(`${type}:${ownerId}`)!.find(file => file.id === Number(button.dataset.download))!), status)
        }))
        section.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => button.addEventListener('click', () => {
          if (!confirm('Удалить этот файл?')) return
          void act(button, async () => { await api.request(api.filesPath(type, ownerId, Number(button.dataset.remove)), 'DELETE'); await loadDetail() }, status)
        }))
        section.querySelector<HTMLInputElement>('input[type="file"]')?.addEventListener('change', async event => {
          const input = event.currentTarget as HTMLInputElement
          const selectedFiles = Array.from(input.files ?? [])
          if (!selectedFiles.length) return
          input.disabled = true
          status.textContent = 'Загрузка файлов…'
          const failures: string[] = []
          for (const file of selectedFiles) {
            try { await api.upload(type, ownerId, file) } catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Ошибка загрузки'}`) }
          }
          if (version !== revision) return
          await loadDetail()
          if (failures.length) report(new Error(`Не удалось загрузить: ${failures.join('; ')}. Остальные файлы сохранены.`))
        })
      })
    } catch (error) {
      if (version !== revision) return
      detail.innerHTML = '<p class="status error" role="status"></p><button class="secondary-button" type="button">Повторить загрузку занятия</button>'
      report(error, detail.querySelector<HTMLElement>('.status')!)
      detail.querySelector('button')!.addEventListener('click', () => void loadDetail())
    }
  }
  const timer = window.setInterval(() => {
    if (!root.isConnected) { window.clearInterval(timer); return }
    if (dialog.open || root.contains(document.activeElement) || root.querySelector('input:disabled, select:disabled, button:disabled:not([data-page])')) return
    if (lessons.some(lesson => lesson.status !== lessonStatus(lesson))) {
      lessons = lessons.map(lesson => ({ ...lesson, status: lessonStatus(lesson) }))
      drawList()
      void loadDetail()
    }
  }, 30_000)
  if (teacher) mountLessonScheduling(root.querySelector<HTMLElement>('[data-course-scheduling]')!, courseId, { onCreateOneOff: () => lessonEditor(), onChanged: loadLessons })
  void loadLessons()
}
