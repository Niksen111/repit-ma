export interface RegistrationRequest {
  username: string
  password: string
}

export interface RegistrationResponse {
  id: number
  username: string
}

interface ApiError {
  message?: string
  fields?: Record<string, string>
}

export async function register(request: RegistrationRequest): Promise<RegistrationResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = (await response.json()) as ApiError
    const fieldMessage = error.fields && Object.values(error.fields)[0]
    throw new Error(fieldMessage || error.message || 'Не удалось зарегистрироваться')
  }

  return response.json() as Promise<RegistrationResponse>
}
