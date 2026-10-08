import { type Lesson } from './courses-api.ts'
import { lessonInstant } from './lesson-management.ts'

export const LESSONS_PER_PAGE = 5

export function selectLesson(lessons: Lesson[], selected: number | null, now = Date.now()): number | null {
  if (lessons.some(lesson => lesson.id === selected)) return selected
  const available = lessons.filter(lesson => lesson.status !== 'CANCELLED')
  const upcoming = available.filter(lesson => lessonInstant(lesson.scheduledAt) > now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const past = available.filter(lesson => lessonInstant(lesson.scheduledAt) <= now)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  return upcoming[0]?.id ?? past[0]?.id ?? lessons[0]?.id ?? null
}

export function pageForLesson(lessons: Lesson[], selected: number | null): number {
  return Math.floor(Math.max(0, lessons.findIndex(lesson => lesson.id === selected)) / LESSONS_PER_PAGE) + 1
}

export function lessonPage<T>(lessons: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(lessons.length / LESSONS_PER_PAGE))
  const page = Math.min(totalPages, Math.max(1, requestedPage))
  const offset = (page - 1) * LESSONS_PER_PAGE
  return { page, totalPages, items: lessons.slice(offset, offset + LESSONS_PER_PAGE), start: lessons.length ? offset + 1 : 0, end: Math.min(offset + LESSONS_PER_PAGE, lessons.length) }
}
