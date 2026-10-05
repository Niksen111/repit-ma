import { getAuthorization } from './auth-api.ts'

export interface Lesson { id: number; title: string; description: string | null; scheduledAt: string }
export interface Task { id: number; lessonId: number; title: string; description: string | null }
export interface Solution { id: number; taskId: number; description: string | null; grade: boolean | null; teacherComment: string | null; gradedAt: string | null }
export interface Attachment { id: number; originalName: string; contentType: string }
export type OwnerType = 'LESSON' | 'TASK' | 'SOLUTION'

export class CourseApi {
  private courseId: number
  constructor(courseId: number) { this.courseId = courseId }

  async request<T>(path: string, method = 'GET', body?: object | FormData): Promise<T> {
    const authorization = getAuthorization()
    if (!authorization) throw new Error('Необходимо войти в аккаунт')
    const headers: Record<string, string> = { Authorization: authorization }
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
    const response = await fetch(`/api/courses/${this.courseId}${path}`, {
      method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string; fields?: Record<string, string> }
      throw new Error(Object.values(error.fields ?? {})[0] || error.message || ({
        401: 'Сессия истекла. Войдите снова.', 403: 'Недостаточно прав для этого действия.',
        404: 'Материал уже удалён или недоступен.', 409: 'Данные изменились. Обновите занятие: оценённое решение нельзя редактировать.',
        413: 'Размер файла превышает 25 МиБ.',
      } as Record<number, string>)[response.status] || 'Не удалось выполнить запрос. Попробуйте ещё раз.')
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') return null as T
    // Spring returns an empty 200 response when there is no solution yet.
    const text = await response.text()
    return text ? JSON.parse(text) as T : null as T
  }

  filesPath(type: OwnerType, ownerId: number, fileId?: number): string {
    return `/files${fileId === undefined ? '' : `/${fileId}`}?ownerType=${type}&ownerId=${ownerId}`
  }

  async upload(type: OwnerType, ownerId: number, file: File): Promise<Attachment> {
    if (file.size > 25 * 1024 * 1024) throw new Error(`«${file.name}»: максимальный размер — 25 МиБ.`)
    if (file.size === 0) throw new Error(`«${file.name}»: файл пуст.`)
    const body = new FormData()
    body.append('file', file)
    return this.request(this.filesPath(type, ownerId), 'POST', body)
  }

  async download(type: OwnerType, ownerId: number, file: Attachment): Promise<void> {
    const authorization = getAuthorization()
    if (!authorization) throw new Error('Необходимо войти в аккаунт')
    const response = await fetch(`/api/courses/${this.courseId}${this.filesPath(type, ownerId, file.id)}`, { headers: { Authorization: authorization } })
    if (!response.ok) throw new Error('Не удалось скачать файл. Возможно, он удалён или сессия истекла.')
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = file.originalName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
