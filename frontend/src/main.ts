import './styles.css'
import { getProfile, login, logout, register, updateProfile, type Profile, type UserRole } from './auth-api.ts'

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
  return `<header class="site-header"><a class="logo" href="/">repit<span>ma</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="Открыть меню"><span></span><span></span><span></span></button><nav id="main-navigation" aria-label="Основная навигация">${links}</nav></header>`
}

function footer(): string {
  return '<footer><a class="logo" href="/">repit<span>ma</span></a><div class="footer-meta"><a href="/privacy">Политика конфиденциальности</a><p>© 2026 Repitma</p></div></footer>'
}

function escapeHtml(value: string | null): string {
  return (value ?? '').replace(/[&<>'"]/g, (symbol) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[symbol]!)
}

function bindHeader(): void {
  const headerElement = document.querySelector<HTMLElement>('.site-header')
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle')
  toggle?.addEventListener('click', () => {
    const isOpen = headerElement?.classList.toggle('menu-open') ?? false
    toggle.setAttribute('aria-expanded', String(isOpen))
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню')
  })
  document.querySelectorAll('#main-navigation a').forEach((link) => {
    link.addEventListener('click', () => headerElement?.classList.remove('menu-open'))
  })
  document.querySelector('#logout')?.addEventListener('click', () => {
    logout()
    window.location.href = '/'
  })
}

function renderHome(profile: Profile | null): void {
  document.title = 'Repitma — обучение вместе'
  app.innerHTML = `${header(profile)}<main><section class="hero"><p class="eyebrow">Образовательная платформа</p><h1>Учимся и растём вместе.</h1><p>Repitma помогает учителям и ученикам организовать обучение в одном месте.</p></section></main>${footer()}`
  bindHeader()
}

function displayValue(value: string | null): string {
  return value ? escapeHtml(value) : '<span class="empty-value">Не указано</span>'
}

function gradeOptions(selected: number | null): string {
  return Array.from({ length: 11 }, (_, index) => index + 1)
    .map((grade) => `<option value="${grade}" ${grade === selected ? 'selected' : ''}>${grade} класс</option>`)
    .join('')
}

function contactDetails(profile: Profile): { type: 'telegram' | 'vk', value: string } {
  if (profile.vk) return { type: 'vk', value: profile.vk }
  return { type: 'telegram', value: profile.telegram ?? '' }
}

function renderAccount(profile: Profile, saved = false): void {
  document.title = 'Аккаунт — Repitma'
  const contact = contactDetails(profile)
  const contactLabel = contact.type === 'telegram' ? 'Telegram' : 'ВКонтакте'
  app.innerHTML = `${header(profile)}<main><section class="account"><p class="eyebrow">Профиль</p><h1>${escapeHtml(profile.username)}</h1>${saved ? '<p class="status success account-message">Профиль сохранён!</p>' : ''}<dl><div><dt>Логин</dt><dd>${escapeHtml(profile.username)}</dd></div><div><dt>Роль</dt><dd>${roleNames[profile.role]}</dd></div><div><dt>Имя</dt><dd>${displayValue(profile.name)}</dd></div><div><dt>${contactLabel}</dt><dd>${displayValue(contact.value)}</dd></div><div><dt>Город</dt><dd>${displayValue(profile.city)}</dd></div><div><dt>Класс</dt><dd>${profile.grade ? `${profile.grade} класс` : '<span class="empty-value">Не указано</span>'}</dd></div></dl><button id="edit-profile" class="primary-button account-action" type="button">Редактировать</button><section class="danger-zone"><h2>Удаление данных</h2><p>Здесь можно будет отправить оператору запрос на удаление персональных данных.</p><button id="deletion-request" class="danger-button" type="button">Запрос на удаление данных</button><p id="deletion-message" class="status" role="status"></p></section></section></main>${footer()}`
  bindHeader()
  document.querySelector('#edit-profile')!.addEventListener('click', () => renderAccountEditor(profile))
  document.querySelector('#deletion-request')!.addEventListener('click', () => {
    const message = document.querySelector<HTMLParagraphElement>('#deletion-message')!
    message.className = 'status notice'
    message.textContent = 'Отправка запросов появится в следующей версии.'
  })
}

function renderAccountEditor(profile: Profile): void {
  const contact = contactDetails(profile)
  const consentInput = profile.personalDataConsentGiven
    ? '<input name="consent" type="checkbox" checked disabled>'
    : '<input name="consent" type="checkbox">'
  const consentText = profile.personalDataConsentGiven
    ? 'Согласие на обработку персональных данных дано.'
    : 'Я согласен на обработку указанных персональных данных.'
  app.innerHTML = `${header(profile)}<main><section class="account"><p class="eyebrow">Редактирование</p><h1>Личные данные</h1><form id="profile-form" class="profile-form"><p class="form-hint">Все поля необязательны.</p><label>Имя<input name="name" maxlength="100" value="${escapeHtml(profile.name)}" placeholder="Как к вам обращаться"></label><div class="contact-fields"><label>Способ связи<select name="contactType"><option value="telegram" ${contact.type === 'telegram' ? 'selected' : ''}>Telegram</option><option value="vk" ${contact.type === 'vk' ? 'selected' : ''}>ВКонтакте</option></select></label><label>Ник<input name="contact" maxlength="64" value="${escapeHtml(contact.value)}" placeholder="${contact.type === 'telegram' ? '@username' : 'username или id12345'}"></label></div><label>Город<input name="city" maxlength="100" value="${escapeHtml(profile.city)}" placeholder="Например, Москва"></label><label>Класс<select name="grade"><option value="">Не указан</option>${gradeOptions(profile.grade)}</select></label><label class="consent ${profile.personalDataConsentGiven ? 'consent-given' : ''}">${consentInput}<span>${consentText}<small>Мы храним данные для отображения и работы вашего профиля. Подробнее — в <a href="/privacy">политике конфиденциальности</a>.</small></span></label><div class="form-actions"><button class="primary-button" type="submit">Сохранить</button><button id="cancel-edit" class="secondary-button" type="button">Отмена</button></div><p id="profile-message" class="status" role="status"></p></form></section></main>${footer()}`
  bindHeader()
  document.querySelector('#cancel-edit')!.addEventListener('click', () => renderAccount(profile))
  const contactType = document.querySelector<HTMLSelectElement>('select[name="contactType"]')!
  const contactInput = document.querySelector<HTMLInputElement>('input[name="contact"]')!
  contactType.addEventListener('change', () => {
    contactInput.value = ''
    contactInput.placeholder = contactType.value === 'telegram' ? '@username' : 'username или id12345'
  })
  document.querySelector<HTMLFormElement>('#profile-form')!.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const message = document.querySelector<HTMLParagraphElement>('#profile-message')!
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
    const selectedContact = String(data.get('contactType') ?? 'telegram')
    const contactValue = String(data.get('contact') ?? '')
    try {
      button.disabled = true
      message.className = 'status'
      message.textContent = ''
      const updated = await updateProfile({
        name: String(data.get('name') ?? ''),
        telegram: selectedContact === 'telegram' ? contactValue : '',
        city: String(data.get('city') ?? ''),
        vk: selectedContact === 'vk' ? contactValue : '',
        grade: data.get('grade') ? Number(data.get('grade')) : null,
        consent: profile.personalDataConsentGiven || data.get('consent') === 'on',
      })
      renderAccount(updated, true)
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
    } finally {
      button.disabled = false
    }
  })
}

function renderPrivacy(profile: Profile | null): void {
  document.title = 'Политика конфиденциальности — Repitma'
  app.innerHTML = `${header(profile)}<main><article class="privacy"><p class="eyebrow">Персональные данные</p><h1>Политика конфиденциальности</h1><p class="policy-date">Редакция от 9 августа 2026 года</p><h2>Оператор</h2><p>Оператор персональных данных — владелец сервиса Repitma. Связаться с оператором можно по адресу <a href="mailto:hello@repitma.ru">hello@repitma.ru</a>.</p><h2>Какие данные мы собираем</h2><p>При создании учётной записи хранятся логин, хеш пароля и роль пользователя. По желанию пользователь может указать имя, ники в Telegram и ВКонтакте, город и класс обучения. Также фиксируется факт и время согласия на обработку этих данных.</p><h2>Зачем нужны данные</h2><p>Данные используются для входа в сервис, разграничения доступа, отображения и работы профиля, а в дальнейшем — для взаимодействия учеников и преподавателей. Мы не используем необязательные данные для рекламы и не продаём их.</p><h2>Кто имеет доступ</h2><p>Доступ имеет сам пользователь, а также уполномоченные администраторы и технические специалисты оператора только в объёме, необходимом для работы и поддержки сервиса.</p><h2>Где и как долго хранятся данные</h2><p>Данные хранятся в базе данных Repitma на сервере, где развёрнут сервис. Они хранятся, пока существует учётная запись и данные нужны для указанных целей, либо до отзыва согласия, если закон не требует хранить их дольше.</p><h2>Удаление данных</h2><p>Чтобы отозвать согласие или запросить удаление данных, напишите на <a href="mailto:hello@repitma.ru">hello@repitma.ru</a> с адреса или контакта, позволяющего подтвердить принадлежность аккаунта. После проверки запроса данные будут удалены в предусмотренный законом срок.</p></article></main>${footer()}`
  bindHeader()
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
  bindHeader()
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
  if (path === '/privacy') {
    renderPrivacy(profile)
    return
  }
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
