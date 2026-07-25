import { register } from './auth-api.ts'

const form = document.querySelector<HTMLFormElement>('#registration-form')
const message = document.querySelector<HTMLParagraphElement>('#form-message')

if (!form || !message) {
  throw new Error('Registration form is missing')
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  message.textContent = ''

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const formData = new FormData(form)
  const username = formData.get('username')
  const password = formData.get('password')

  if (typeof username !== 'string' || username.length === 0) {
    message.textContent = 'Введите логин'
    return
  }

  if (typeof password !== 'string' || password.length === 0) {
    message.textContent = 'Введите пароль'
    return
  }

  try {
    if (submitButton) submitButton.disabled = true
    const user = await register({ username, password })
    message.textContent = `Пользователь ${user.username} зарегистрирован`
    form.reset()
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : 'Произошла неизвестная ошибка'
  } finally {
    if (submitButton) submitButton.disabled = false
  }
})
