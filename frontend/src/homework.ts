import { getAuthorization, type Profile } from './auth-api.ts'
import { CourseApi } from './courses-api.ts'
import { escape, lessonDate } from './lesson-management.ts'

export interface Homework {
  courseId: number
  academicYear: string
  studentUsername: string
  studentName: string | null
  teacherUsername: string
  teacherName: string | null
  lessonId: number
  lessonTitle: string
  scheduledAt: string
  taskId: number
  taskTitle: string
  description: string | null
}

export function homeworkMarkup(items: Homework[], teacher: boolean): string {
  if (!items.length) return `<div class="empty-list"><h2>${teacher ? 'Работ на проверку пока нет' : 'Нет заданий, ожидающих сдачи'}</h2><p>${teacher ? 'Здесь появятся решения, отправленные учениками и ещё не получившие оценку.' : 'Когда преподаватель добавит новое задание, оно появится здесь.'}</p></div>`
  return items.map(item => `<article class="homework-queue-card" data-task="${item.taskId}"><div class="materials-heading"><h2>${escape(item.taskTitle)}</h2><span class="grade-badge">${teacher ? 'Ожидает проверки' : 'Ожидает сдачи'}</span></div><p class="homework-participant">${teacher ? 'Ученик' : 'Преподаватель'}: <strong>${escape(teacher ? item.studentName || item.studentUsername : item.teacherName || item.teacherUsername)}</strong> · Курс ${escape(item.academicYear)}</p><p class="muted">${escape(item.lessonTitle)} · <time datetime="${escape(item.scheduledAt)}+03:00">${escape(lessonDate(item.scheduledAt))} МСК</time></p>${item.description ? `<p class="homework-excerpt">${escape(item.description)}</p>` : ''}<a class="primary-button" href="/courses/${item.courseId}?lesson=${item.lessonId}&amp;task=${item.taskId}">${teacher ? 'Проверить решение' : 'Открыть задание'} →</a>${teacher ? '' : '<button class="secondary-button" type="button" data-complete>Сделано без решения</button>'}<p class="status" role="status" data-task-message></p></article>`).join('')
}

export function mountHomework(root: HTMLElement, profile: Profile): void {
  const teacher = profile.role !== 'STUDENT'
  root.innerHTML = `<div class="homework-toolbar"><p class="muted" data-count aria-live="polite"></p><button class="secondary-button" type="button" data-refresh>Обновить</button></div><p class="status" role="status" data-message></p><div class="homework-queue" data-list></div>`
  const list = root.querySelector<HTMLElement>('[data-list]')!
  const count = root.querySelector<HTMLElement>('[data-count]')!
  const message = root.querySelector<HTMLElement>('[data-message]')!
  const refresh = root.querySelector<HTMLButtonElement>('[data-refresh]')!

  async function load(): Promise<void> {
    refresh.disabled = true
    message.className = 'status'
    message.textContent = 'Загрузка домашних заданий…'
    try {
      const authorization = getAuthorization()
      if (!authorization) throw new Error('Необходимо войти в аккаунт')
      const response = await fetch('/api/homework', { headers: { Authorization: authorization } })
      if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите снова.' : 'Не удалось загрузить домашние задания. Нажмите «Обновить».')
      const items = await response.json() as Homework[]
      list.innerHTML = homeworkMarkup(items, teacher)
      list.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach(button => button.addEventListener('click', async () => {
        const card = button.closest<HTMLElement>('[data-task]')!
        const item = items.find(item => item.taskId === Number(card.dataset.task))!
        const status = card.querySelector<HTMLElement>('[data-task-message]')!
        button.disabled = true
        status.textContent = ''
        try {
          await new CourseApi(item.courseId).request('/tasks/' + item.taskId + '/completion', 'PUT', { completed: true })
          await load()
        } catch (error) {
          status.className = 'status error'
          status.textContent = error instanceof Error ? error.message : 'Не удалось сохранить отметку'
        } finally { button.disabled = false }
      }))
      count.textContent = `${teacher ? 'На проверку' : 'Ожидают сдачи'}: ${items.length}`
      message.textContent = ''
    } catch (error) {
      list.replaceChildren()
      count.textContent = ''
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Не удалось загрузить домашние задания'
    } finally { refresh.disabled = false }
  }

  refresh.addEventListener('click', () => void load())
  window.addEventListener('pageshow', event => { if (event.persisted && root.isConnected) void load() })
  void load()
}
