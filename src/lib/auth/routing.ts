export type AppRole = 'STUDENT' | 'FACULTY' | 'ADMIN'

export function getHomeForRole(role: AppRole | undefined | null) {
  if (role === 'FACULTY') return '/faculty/dashboard'
  if (role === 'ADMIN') return '/admin'
  return '/dashboard'
}

export function getSafeRedirectTarget(value: string | null) {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  return value
}
