import './styles.css'
import { mariaReviews, reviewLoginDestination } from './maria-reviews.ts'
import { mountReviews, renderReviews } from './reviews.ts'
import { getTeacherSite, renderTeacherContacts, teacherSites, type TeacherSite } from './teacher-site.ts'
import { renderOlgaHome } from './olga-home.ts'
import { mountCourseLearning } from './course-learning.ts'
import { mountTeacherSchedule } from './teacher-schedule.ts'
import { mountLessonScheduling } from './recurring-lessons.ts'
import { getCourse, getCourses, getProfile, getTeachers, login, logout, register, updateProfile, type CourseSummary, type Profile, type TeacherSummary, type UserRole } from './auth-api.ts'

const app = document.querySelector<HTMLDivElement>('#app')!
let currentSite: TeacherSite = teacherSites.maria
const roleNames: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  TEACHER: 'Преподаватель',
  STUDENT: 'Ученик',
}

function header(profile: Profile | null): string {
  const canRegister = profile?.role === 'ADMIN' || profile?.role === 'TEACHER'
  const registrationLink = canRegister ? '<a href="/register">Регистрация</a>' : ''
  const studentsLink = profile?.role === 'TEACHER' || profile?.role === 'ADMIN' ? '<a href="/students">Ученики</a>' : ''
  const learningLink = profile?.role === 'STUDENT' ? '<a href="/learning">Обучение</a>' : ''
  const scheduleLink = profile?.role === 'TEACHER' || profile?.role === 'ADMIN' ? '<a href="/schedule">Расписание</a>' : ''
  const links = profile
    ? `<a href="/">Главная</a>${studentsLink}${learningLink}${scheduleLink}${registrationLink}<a href="/account">Аккаунт</a><button id="logout" type="button">Выйти</button>`
    : '<a href="/">Главная</a><a class="login-link" href="/login">Войти</a>'
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
  if (currentSite.key === 'olga') {
    document.title = 'Ольга Королева — репетитор по математике'
    app.innerHTML = `${header(profile)}${renderOlgaHome(escapeHtml)}${footer()}`
    bindHeader()
    mountReviews(app)
    return
  }
  document.title = 'Мария Воробьева — преподаватель математики'
  app.innerHTML = `${header(profile)}<main class="teacher-page"><section class="teacher-hero"><div class="teacher-intro"><p class="eyebrow">Преподаватель математики</p><h1>Мария Александровна Воробьева</h1><p class="teacher-lead">Помогаю ученикам понять и полюбить математику — от школьной программы до олимпиад и ЕГЭ.</p><ul class="teacher-meta" aria-label="Краткая информация"><li>23 года</li><li>Стаж 5 лет</li><li>Санкт-Петербург</li></ul><div class="teacher-contacts" aria-label="Контакты Марии"><a href="https://t.me/supruno7" target="_blank" rel="noopener noreferrer"><span>Telegram</span><strong>@supruno7</strong></a><a href="https://vk.com/suprunno" target="_blank" rel="noopener noreferrer"><span>ВКонтакте</span><strong>@suprunno</strong></a><a href="https://wa.me/79887394970" target="_blank" rel="noopener noreferrer"><span>WhatsApp</span><strong>+7 988 739 4970</strong></a></div></div><figure class="teacher-photo"><div class="teacher-photo-frame"><img src="/images/maria-vorobieva-graduation-cropped.webp" alt="Мария Александровна Воробьева с дипломом СПбГУ" width="1200" height="900" fetchpriority="high"></div><figcaption>СПбГУ · фундаментальная математика · специалист</figcaption></figure></section><section class="teacher-results"><div class="section-title"><p class="eyebrow">Учебный год 2025/26</p><h2>Результаты учеников</h2></div><div class="results-grid"><article class="result-card ege-card"><span class="result-label">Лучшие баллы ЕГЭ</span><p class="score-line"><strong>98</strong><strong>98</strong><strong>96</strong><strong>90</strong><strong>88</strong></p></article><article class="result-card progress-card"><span class="result-label">Менее года подготовки</span><div class="progress-list"><span><s>22</s><b>64</b></span><span><s>40</s><b>72</b></span><span><s>46</s><b>78</b></span></div></article><article class="result-card olympiad-card"><span class="result-label">Дипломы олимпиад</span><ul><li>призёр МОШ</li><li>призёр «Физтех»</li><li>призёр «Курчатов»</li><li>победитель олимпиады на базе ведомственных организаций</li><li>призёр олимпиады имени Верченко</li><li>победитель «Надежды энергетики»</li></ul></article></div></section><section class="teacher-experience"><div class="teacher-experience-inner"><div class="section-title"><p class="eyebrow">Опыт и образование</p><h2>Математика с опорой на практику</h2></div><div class="experience-grid"><article><h3>Направления подготовки</h3><p>Тренер олимпиадной подготовки.<br>Готовлю учеников к сдаче таких экзаменов как ЕГЭ и ОГЭ, а также ДВИ при поступлении в вузы. Также занимаюсь повышением успеваемости.</p></article><article><h3>Подготовка к поступлению</h3><p>Имею опыт успешной подготовки учеников к поступлению в Физтех-лицей, лицей НИУ ВШЭ, школу Летово, лицей Лобачевского, СУНЦ МГУ и др.</p></article><article><h3>Преподавательский опыт</h3><p>2,5 года работала в региональном центре дополнительного образования и вела курсы по олимпиадной математике. Участвовала в летних школах по подготовке к ЕГЭ и интенсивах по разбору второй части. Преподавала в университете в рамках педагогической практики.</p></article><article><h3>Личный олимпиадный путь</h3><p>Была призёром олимпиад «Физтех», по математике и криптографии имени Верченко и олимпиады по математике имени Курчатова.</p></article></div></div></section><section class="teacher-format" aria-labelledby="lesson-format-title"><h2 id="lesson-format-title">Формат занятий</h2><div class="lesson-format-copy"><p>Занятия проходят на удобной онлайн-платформе, с использованием онлайн-доски, где ученики также могут делать записи вместе со мной.</p><p>Первое диагностическое занятие, где мы знакомимся и я определяю уровень начальной подготовки, — <strong>БЕСПЛАТНОЕ</strong>.</p><p>Стоимость занятий <strong>от 2000 р/час</strong>.</p></div></section><section class="teacher-approach"><p class="eyebrow">Подход к занятиям</p><blockquote>Стараюсь найти индивидуальный подход к каждому ученику. В начале работы определяю уровень знаний и составляю программу, чтобы занятия проходили с максимальной эффективностью.</blockquote><div class="approach-copy"><p>Успешно работаю как с сильными учениками, так и с маломотивированными ребятами, которых прежде всего важно заинтересовать предметом.</p><p>Люблю свою работу и много в неё вкладываюсь.</p></div></section>${renderReviews(mariaReviews, teacherSites.maria.withName, escapeHtml)}</main>${footer()}`
  bindHeader()
  mountReviews(app)
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
  if (profile.role !== 'STUDENT') document.querySelector('.account dl')?.lastElementChild?.remove()
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
  if (profile.role !== 'STUDENT') document.querySelector('select[name="grade"]')?.closest('label')?.remove()
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
  app.innerHTML = `${header(profile)}<main><article class="privacy"><p class="eyebrow">Персональные данные</p><h1>Политика конфиденциальности</h1><p class="policy-date">Редакция от 9 августа 2026 года</p><h2>Оператор</h2><p>Оператор персональных данных — владелец сервиса Repitma. Связаться с оператором можно по адресу <a href="mailto:nikiksen2003@gmail.com">nikiksen2003@gmail.com</a>.</p><h2>Какие данные мы собираем</h2><p>При создании учётной записи хранятся логин, хеш пароля и роль пользователя. По желанию пользователь может указать имя, ники в Telegram и ВКонтакте, город и класс обучения. Также фиксируется факт и время согласия на обработку этих данных.</p><h2>Зачем нужны данные</h2><p>Данные используются для входа в сервис, разграничения доступа, отображения и работы профиля, а в дальнейшем — для взаимодействия учеников и преподавателей. Мы не используем необязательные данные для рекламы и не продаём их.</p><h2>Кто имеет доступ</h2><p>Доступ имеет сам пользователь, а также уполномоченные администраторы и технические специалисты оператора только в объёме, необходимом для работы и поддержки сервиса.</p><h2>Где и как долго хранятся данные</h2><p>Данные хранятся в базе данных Repitma на сервере, где развёрнут сервис. Они хранятся, пока существует учётная запись и данные нужны для указанных целей, либо до отзыва согласия, если закон не требует хранить их дольше.</p><h2>Удаление данных</h2><p>Чтобы отозвать согласие или запросить удаление данных, напишите на <a href="mailto:nikiksen2003@gmail.com">nikiksen2003@gmail.com</a> с адреса или контакта, позволяющего подтвердить принадлежность аккаунта. После проверки запроса данные будут удалены в предусмотренный законом срок.</p></article></main>${footer()}`
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
      window.location.href = reviewLoginDestination(window.location.search)
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
    } finally {
      button.disabled = false
    }
  })
  bindHeader()
}

function renderReviewContact(profile: Profile): void {
  document.title = `Оставить отзыв — ${currentSite.name}`
  app.innerHTML = `${header(profile)}<main><section class="account review-contact-page"><a class="back-link" href="/#reviews-title">← К отзывам</a><p class="eyebrow">Обратная связь о занятиях</p><h1>Поделитесь впечатлениями</h1><div class="review-contact-card"><h2>Напишите ${escapeHtml(currentSite.toName)}</h2><p>Вы можете отправить отзыв ${escapeHtml(currentSite.toName)}, связавшись по одному из контактов ниже. Ваш отзыв будет позже добавлен на сайт.</p>${renderTeacherContacts(currentSite, escapeHtml)}</div></section></main>${footer()}`
  bindHeader()
}

function renderRegistration(profile: Profile, teachers: TeacherSummary[], teachersError: string | null = null): void {
  const isTeacher = profile.role === 'TEACHER'
  const roleField = isTeacher
    ? '<input name="role" type="hidden" value="STUDENT"><p class="fixed-role">Роль: <strong>Ученик</strong></p>'
    : '<label>Роль<select name="role" required><option value="STUDENT">Ученик</option><option value="TEACHER">Преподаватель</option><option value="ADMIN">Администратор</option></select></label>'
  const teacherOptions = teachers.map((teacher) =>
    `<option value="${teacher.id}">${escapeHtml(teacher.username)}</option>`).join('')
  const teacherStateOption = teachersError
    ? '<option value="" disabled>Не удалось загрузить преподавателей</option>'
    : teachers.length === 0 ? '<option value="" disabled>Преподаватели не найдены</option>' : ''
  const teacherHint = teachersError ?? 'Можно оставить пустым и назначить преподавателя позже.'
  const teacherField = isTeacher ? '' : `<label id="teacher-field">Преподаватель<select name="teacherId"><option value="">Не назначен</option>${teacherStateOption}${teacherOptions}</select><small>${escapeHtml(teacherHint)}</small></label>`
  document.title = 'Регистрация пользователя — Repitma'
  app.innerHTML = `${header(profile)}<main><section class="auth-card"><p class="eyebrow">${isTeacher ? 'Новый ученик' : 'Управление пользователями'}</p><h1 class="registration-title"><span>Новый</span> <span>пользователь</span></h1><form><label>Логин<input name="username" autocomplete="off" minlength="3" maxlength="32" required></label><label>Пароль<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>${roleField}${teacherField}<button class="primary-button" type="submit">Создать пользователя</button><p id="message" role="status"></p></form></section></main>${footer()}`
  bindHeader()
  const roleSelect = document.querySelector<HTMLSelectElement>('select[name="role"]')
  const teacherFieldElement = document.querySelector<HTMLElement>('#teacher-field')
  roleSelect?.addEventListener('change', () => {
    if (!teacherFieldElement) return
    const teacherSelect = teacherFieldElement.querySelector<HTMLSelectElement>('select[name="teacherId"]')
    const isStudent = roleSelect.value === 'STUDENT'
    teacherFieldElement.hidden = !isStudent
    if (teacherSelect) {
      teacherSelect.disabled = !isStudent
      if (!isStudent) teacherSelect.value = ''
    }
  })
  document.querySelector('form')!.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const username = String(data.get('username') ?? '')
    const password = String(data.get('password') ?? '')
    const role = String(data.get('role') ?? '') as UserRole
    const teacherId = data.get('teacherId') ? Number(data.get('teacherId')) : null
    const message = document.querySelector<HTMLParagraphElement>('#message')!
    const button = form.querySelector<HTMLButtonElement>('button')!
    try {
      button.disabled = true
      message.className = 'status'
      message.textContent = ''
      const created = await register(username, password, role, teacherId)
      message.className = 'status success'
      const title = document.createElement('strong')
      title.textContent = 'Пользователь создан!'
      const credentials = `Логин: ${created.username}\nПароль: ${password}`
      const details = document.createElement('span')
      details.className = 'registration-credentials'
      details.textContent = credentials
      const copyButton = document.createElement('button')
      copyButton.type = 'button'
      copyButton.className = 'secondary-button registration-copy'
      copyButton.textContent = 'Скопировать логин и пароль'
      const copyMessage = document.createElement('span')
      copyMessage.className = 'status registration-copy-status'
      copyMessage.setAttribute('role', 'status')
      copyButton.addEventListener('click', async () => {
        copyButton.disabled = true
        copyMessage.textContent = ''
        try {
          await navigator.clipboard.writeText(credentials)
          copyMessage.className = 'status registration-copy-status'
          copyMessage.textContent = 'Логин и пароль скопированы'
        } catch {
          copyMessage.className = 'status error registration-copy-status'
          copyMessage.textContent = 'Не удалось скопировать автоматически. Выделите логин и пароль и скопируйте вручную.'
        } finally {
          copyButton.disabled = false
        }
      })
      message.replaceChildren(title, details, copyButton, copyMessage)
      form.reset()
    } catch (error) {
      message.className = 'status error'
      message.textContent = error instanceof Error ? error.message : 'Произошла ошибка'
    } finally {
      button.disabled = false
    }
  })
}

function courseContact(course: CourseSummary): string {
  if (course.telegram) return `Telegram: ${escapeHtml(course.telegram)}`
  if (course.vk) return `ВКонтакте: ${escapeHtml(course.vk)}`
  return '<span class="empty-value">Контакт не указан</span>'
}

function teacherCourseContact(course: CourseSummary): string {
  if (course.teacherTelegram) return `Telegram: ${escapeHtml(course.teacherTelegram)}`
  if (course.teacherVk) return `ВКонтакте: ${escapeHtml(course.teacherVk)}`
  return '<span class="empty-value">Контакт не указан</span>'
}

function renderStudents(profile: Profile, courses: CourseSummary[]): void {
  document.title = 'Ученики — Repitma'
  const rows = courses.length
    ? courses.map((course) => `<article class="student-card"><a class="student-row" href="/courses/${course.id}"><span><strong>${escapeHtml(course.username)}</strong>${course.name ? `<small>${escapeHtml(course.name)}</small>` : ''}</span><span>${displayValue(course.city)}</span><span>${courseContact(course)}</span><span class="row-arrow">→</span></a><div class="student-scheduling" id="student-scheduling-${course.id}"></div></article>`).join('')
    : '<div class="empty-list"><h2>Учеников пока нет</h2><p>Зарегистрируйте ученика — курс текущего учебного года создастся автоматически.</p><a class="primary-button" href="/register">Зарегистрировать ученика</a></div>'
  app.innerHTML = `${header(profile)}<main><section class="students-page"><p class="eyebrow">Текущий учебный год</p><h1>Ученики</h1><div class="student-list">${rows}</div></section></main>${footer()}`
  bindHeader()
  courses.forEach(course => mountLessonScheduling(document.querySelector<HTMLElement>(`#student-scheduling-${course.id}`)!, course.id))
}

function renderCourse(profile: Profile, course: CourseSummary): void {
  if (profile.role === 'STUDENT') {
    document.title = `Обучение — ${course.teacherName ?? 'преподаватель'}`
    const teacherContact = teacherCourseContact(course)
    app.innerHTML = `${header(profile)}<main><section class="course-page"><a class="back-link" href="/learning">← Все курсы</a><p class="eyebrow">Курс ${escapeHtml(course.academicYear)}</p><h1>Обучение</h1><div class="course-layout"><dl><div><dt>Имя преподавателя</dt><dd>${displayValue(course.teacherName)}</dd></div><div><dt>Контакт</dt><dd>${teacherContact}</dd></div></dl><div id="course-learning" class="course-materials"></div></div></section></main>${footer()}`
    bindHeader()
    mountCourseLearning(document.querySelector<HTMLElement>('#course-learning')!, profile, course.id)
    return
  }
  document.title = `${course.name ?? course.username} — курс`
  app.innerHTML = `${header(profile)}<main><section class="course-page student-course-page"><a class="back-link" href="/students">← Все ученики</a><p class="eyebrow">Курс ${escapeHtml(course.academicYear)}</p><h1>${escapeHtml(course.name ?? course.username)}</h1><div class="course-layout"><details class="student-course-details" open><summary>Об ученике${course.grade ? `<span class="student-course-grade"> · ${course.grade} класс</span>` : ''}</summary><dl><div><dt>Логин</dt><dd>${escapeHtml(course.username)}</dd></div><div><dt>Имя</dt><dd>${displayValue(course.name)}</dd></div><div><dt>Город</dt><dd>${displayValue(course.city)}</dd></div><div><dt>Класс</dt><dd>${course.grade ? `${course.grade} класс` : '<span class="empty-value">Не указано</span>'}</dd></div><div><dt>Контакт</dt><dd>${courseContact(course)}</dd></div></dl></details><div id="course-learning" class="course-materials"></div></div></section></main>${footer()}`
  bindHeader()
  const studentDetails = document.querySelector<HTMLDetailsElement>('.student-course-details')!
  const mobile = window.matchMedia('(max-width: 760px)')
  const updateStudentDetails = () => {
    if (!studentDetails.isConnected) { mobile.removeEventListener('change', updateStudentDetails); return }
    studentDetails.open = !mobile.matches
  }
  updateStudentDetails()
  mobile.addEventListener('change', updateStudentDetails)
  mountCourseLearning(document.querySelector<HTMLElement>('#course-learning')!, profile, course.id)
}

function renderLearning(profile: Profile, courses: CourseSummary[]): void {
  document.title = 'Обучение — Repitma'
  const content = courses.length === 0
    ? '<div class="empty-list"><h2>Активных курсов нет</h2><p>Когда преподаватель назначит вам курс, он появится здесь.</p></div>'
    : courses.map((course) => `<a class="student-row" href="/courses/${course.id}"><span><strong>${escapeHtml(course.teacherName ?? 'Преподаватель')}</strong><small>Курс ${escapeHtml(course.academicYear)}</small></span><span>${teacherCourseContact(course)}</span><span class="row-arrow">→</span></a>`).join('')
  app.innerHTML = `${header(profile)}<main><section class="students-page"><p class="eyebrow">Текущий учебный год</p><h1>Обучение</h1><div class="student-list learning-list">${content}</div></section></main>${footer()}`
  bindHeader()
}

async function start(): Promise<void> {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  let profile: Profile | null
  try {
    const result = await Promise.all([getTeacherSite(window.location.hostname), getProfile().catch(() => null)])
    currentSite = result[0]
    profile = result[1]
  } catch {
    document.title = 'Страница временно недоступна — Repitma'
    app.innerHTML = `${header(null)}<main><section class="account"><h1>Страница временно недоступна</h1><p class="teacher-lead">Не удалось загрузить данные преподавателя. Попробуйте обновить страницу.</p><a class="primary-button" href="${escapeHtml(window.location.pathname)}">Повторить</a></section></main>${footer()}`
    bindHeader()
    return
  }
  if (path === '/reviews/new') {
    if (!profile) {
      window.location.href = '/login?next=%2Freviews%2Fnew'
      return
    }
    renderReviewContact(profile)
    return
  }
  if (path === '/privacy') {
    renderPrivacy(profile)
    return
  }
  if (path === '/login') {
    if (profile) {
      window.location.href = reviewLoginDestination(window.location.search)
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
    if (profile.role !== 'ADMIN' && profile.role !== 'TEACHER') {
      window.location.href = '/account'
      return
    }
    let teachers: TeacherSummary[] = []
    let teachersError: string | null = null
    if (profile.role === 'ADMIN') {
      try {
        teachers = await getTeachers()
      } catch (error) {
        teachersError = error instanceof Error ? error.message : 'Не удалось загрузить преподавателей'
      }
    }
    renderRegistration(profile, teachers, teachersError)
    return
  }
  if (path === '/students') {
    if (!profile || (profile.role !== 'TEACHER' && profile.role !== 'ADMIN')) {
      window.location.href = profile ? '/account' : '/login'
      return
    }
    const courses = await getCourses().catch(() => [])
    renderStudents(profile, courses)
    return
  }
  if (path === '/schedule') {
    if (!profile || (profile.role !== 'TEACHER' && profile.role !== 'ADMIN')) {
      window.location.href = profile ? '/account' : '/login'
      return
    }
    document.title = 'Расписание — Repitma'
    app.innerHTML = `${header(profile)}<main><section class="students-page schedule-page"><p class="eyebrow">Занятия и оплата</p><h1>Расписание</h1><div id="teacher-schedule"></div></section></main>${footer()}`
    bindHeader()
    mountTeacherSchedule(document.querySelector<HTMLElement>('#teacher-schedule')!)
    return
  }
  if (path === '/learning') {
    if (!profile || profile.role !== 'STUDENT') {
      window.location.href = profile ? '/account' : '/login'
      return
    }
    const courses = await getCourses().catch(() => [])
    if (courses.length === 1) {
      window.location.href = `/courses/${courses[0].id}`
      return
    }
    renderLearning(profile, courses)
    return
  }
  const courseMatch = path.match(/^\/courses\/(\d+)$/)
  if (courseMatch) {
    if (!profile) {
      window.location.href = profile ? '/account' : '/login'
      return
    }
    const course = await getCourse(Number(courseMatch[1])).catch(() => null)
    if (!course) {
      window.location.href = profile.role === 'STUDENT' ? '/learning' : '/students'
      return
    }
    renderCourse(profile, course)
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
