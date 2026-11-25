const protectedPages = new Set([
  '/account',
  '/calendar',
  '/homework',
  '/learning',
  '/register',
  '/reviews/new',
  '/schedule',
  '/students',
])

export const coursePathPattern = /^\/courses\/(\d+)$/

export function requiresLogin(path: string): boolean {
  return protectedPages.has(path) || coursePathPattern.test(path)
}

export function loginDestination(search: string): string {
  const next = new URLSearchParams(search).get('next')
  if (!next) return '/account'

  const path = next.split(/[?#]/, 1)[0].replace(/\/$/, '')
  return requiresLogin(path) ? next : '/account'
}
