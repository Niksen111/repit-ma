export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface Profile {
  id: number
  username: string
  role: UserRole
  name: string | null
  telegram: string | null
  city: string | null
  vk: string | null
  grade: number | null
  personalDataConsentGiven: boolean
}

export interface ProfileUpdate {
  name: string
  telegram: string
  city: string
  vk: string
  grade: number | null
  consent: boolean
}

interface ApiError {
  message?: string
  fields?: Record<string, string>
}

const AUTH_KEY = 'repitma.auth'

export function getAuthorization(): string | null {
  return sessionStorage.getItem(AUTH_KEY)
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY)
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const error = await response.json().catch(() => ({})) as ApiError
  const fieldMessage = error.fields && Object.values(error.fields)[0]
  return fieldMessage || error.message || fallback
}

export async function register(username: string, password: string, role: UserRole): Promise<Profile> {
  const authorization = getAuthorization()
  if (!authorization) throw new Error('Для регистрации пользователя войдите как администратор')
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ username, password, role }),
  })
  if (response.status === 403) throw new Error('Регистрировать пользователей может только администратор')
  if (!response.ok) throw new Error(await errorMessage(response, 'Не удалось зарегистрироваться'))
  return response.json() as Promise<Profile>
}

export async function login(username: string, password: string): Promise<Profile> {
  const authorization = `Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`
  const response = await fetch('/api/profile', { headers: { Authorization: authorization } })
  if (!response.ok) throw new Error('Неверный логин или пароль')
  sessionStorage.setItem(AUTH_KEY, authorization)
  return response.json() as Promise<Profile>
}

export async function getProfile(): Promise<Profile | null> {
  const authorization = getAuthorization()
  if (!authorization) return null
  const response = await fetch('/api/profile', { headers: { Authorization: authorization } })
  if (response.status === 401) {
    logout()
    return null
  }
  if (!response.ok) throw new Error('Не удалось загрузить профиль')
  return response.json() as Promise<Profile>
}

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const authorization = getAuthorization()
  if (!authorization) throw new Error('Войдите, чтобы изменить профиль')
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify(update),
  })
  if (!response.ok) throw new Error(await errorMessage(response, 'Не удалось сохранить профиль'))
  return response.json() as Promise<Profile>
}
