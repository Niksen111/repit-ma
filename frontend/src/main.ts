import './styles.css'
import { getProfile, login, logout, register, type Profile, type UserRole } from './auth-api.ts'

const app = document.querySelector<HTMLDivElement>('#app')!
const roleNames: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  TEACHER: 'Преподаватель',
  STUDENT: 'Ученик',
}

function header(profile: Profile | null): string {
  const registrationLink = profile?.role === 'ADMIN' ? '<a href="/register">Регистрация</a>' : ''
  const links = profile
    ? `<a href="/">Главная</a>${registrationLink}<a href="/account">Аккаунт</a><button id="logout" type="button">Выйти</button>`
    : '<a href="/">Главная</a><a href="/login">Войти</a>'
  return `<header class="site-header"><a class="logo" href="/">repit<span>ma</span></a><nav aria-label="Основная навигация">${links}</nav></header>`
}

function footer(): string {
  return '<footer><a class="logo" href="/">repit<span>ma</span></a><p>© 2026 Repitma</p></footer>'
}

function bindLogout(): void {
  document.querySelector('#logout')?.addEventListener('click', () => {
    logout()
    window.location.href = '/'
  })
}

function renderHome(profile: Profile | null): void {
  document.title = 'Repitma — обучение вместе'
  app.innerHTML = `${header(profile)}<main><section class="hero"><p class="eyebrow">Образовательная платформа</p><h1>Учимся и растём вместе.</h1><p>Repitma помогает учителям и ученикам организовать обучение в одном месте.</p></section></main>${footer()}`
  bindLogout()
}

function renderAccount(profile: Profile): void {
  document.title = 'Аккаунт — Repitma'
  app.innerHTML = `${header(profile)}<main><section class="account"><p class="eyebrow">Профиль</p><h1>${profile.username}</h1><dl><div><dt>Логин</dt><dd>${profile.username}</dd></div><div><dt>Роль</dt><dd>${roleNames[profile.role]}</dd></div></dl></section></main>${footer()}`
  bindLogout()
}

function renderLogin(): void {
  document.title = 'Вход — Repitma'
  app.innerHTML = `${header(null)}<main><section class="auth-card"><p class="eyebrow">Вход</p><h1>Войти</h1><form><label>Логин<input name="username" autocomplete="username" minlength="3" maxlength="32" required></label><label>Пароль<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="72" required></label><button class="primary-button" type="submit">Войти</button><p id="message" role="status"></p></form></section></main>${footer()}`
  document.querySelector('form')!.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const username = String(data.get('username') ?? '')
    const password = String(data.get('password') ?? '')
    const message = document.querySelector<HTMLParagraphElement>('#message')!
    const button = form.querySelector<HTMLButtonElement>('button')!
    try {
      button.disabled = true
      message.textContent = ''
      await login(username, password)
      window.location.href = '/account'
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
    } finally {
      button.disabled = false
    }
  })
}

function renderRegistration(profile: Profile): void {
  document.title = 'Регистрация пользователя — Repitma'
  app.innerHTML = `${header(profile)}<main><section class="auth-card"><p class="eyebrow">Для администратора</p><h1>Новый пользователь</h1><form><label>Логин<input name="username" autocomplete="off" minlength="3" maxlength="32" required></label><label>Пароль<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label><label>Роль<select name="role" required><option value="STUDENT">Ученик</option><option value="TEACHER">Преподаватель</option><option value="ADMIN">Администратор</option></select></label><button class="primary-button" type="submit">Создать пользователя</button><p id="message" role="status"></p></form></section></main>${footer()}`
  bindLogout()
  document.querySelector('form')!.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const username = String(data.get('username') ?? '')
    const password = String(data.get('password') ?? '')
    const role = String(data.get('role') ?? '') as UserRole
    const message = document.querySelector<HTMLParagraphElement>('#message')!
    const button = form.querySelector<HTMLButtonElement>('button')!
    try {
      button.disabled = true
      message.className = 'status'
      message.textContent = ''
      const created = await register(username, password, role)
      message.className = 'status success'
      const title = document.createElement('strong')
      title.textContent = 'Пользователь создан!'
      message.replaceChildren(title, document.createElement('br'), `Логин: ${created.username}`)
      form.reset()
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
    } finally {
      button.disabled = false
    }
  })
}

async function start(): Promise<void> {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const profile = await getProfile().catch(() => null)
  if (path === '/login') {
    if (profile) {
      window.location.href = '/account'
      return
    }
    renderLogin()
    return
  }
  if (path === '/register') {
    if (!profile) {
      window.location.href = '/login'
      return
    }
    if (profile.role !== 'ADMIN') {
      window.location.href = '/account'
      return
    }
    renderRegistration(profile)
    return
  }
  if (path === '/account') {
    if (!profile) {
      window.location.href = '/login'
      return
    }
    renderAccount(profile)
    return
  }
  renderHome(profile)
}

void start()
