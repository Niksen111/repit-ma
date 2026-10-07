export type TeacherKey = 'maria' | 'olga'

interface Contact {
  label: string
  value: string
  href: string
}

export interface TeacherSite {
  key: TeacherKey
  name: string
  toName: string
  withName: string
  contacts: readonly Contact[]
}

export const teacherSites: Record<TeacherKey, TeacherSite> = {
  maria: {
    key: 'maria', name: 'Мария Александровна', toName: 'Марии Александровне', withName: 'Марией Александровной',
    contacts: [
      { label: 'Telegram', value: '@supruno7', href: 'https://t.me/supruno7' },
      { label: 'ВКонтакте', value: '@suprunno', href: 'https://vk.com/suprunno' },
      { label: 'WhatsApp', value: '+7 988 739 4970', href: 'https://wa.me/79887394970' },
    ],
  },
  olga: {
    key: 'olga', name: 'Ольга Евгеньевна', toName: 'Ольге Евгеньевне', withName: 'Ольгой Евгеньевной',
    contacts: [
      { label: 'Telegram', value: '@l_ondal', href: 'https://t.me/l_ondal' },
      { label: 'Телефон', value: '+7 911 115 09 16', href: 'tel:+79111150916' },
    ],
  },
}

export async function getTeacherSite(hostname: string): Promise<TeacherSite> {
  try {
    const response = await fetch('/api/public/site', { cache: 'no-store' })
    if (!response.ok) throw new Error('Не удалось загрузить страницу преподавателя')
    const data = await response.json() as { teacher?: string }
    if (data.teacher !== 'maria' && data.teacher !== 'olga') throw new Error('Неизвестный преподаватель')
    return teacherSites[data.teacher]
  } catch (error) {
    // Vite-only development works without starting the Java backend.
    if (hostname === 'okoroleva.localhost') return teacherSites.olga
    if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return teacherSites.maria
    throw error
  }
}

export function renderTeacherContacts(site: TeacherSite, escape: (text: string) => string): string {
  return `<div class="teacher-contacts" aria-label="Контакты: ${escape(site.name)}">${site.contacts.map(contact => `<a href="${escape(contact.href)}"${contact.href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}><span>${escape(contact.label)}</span><strong>${escape(contact.value)}</strong></a>`).join('')}</div>`
}
