import { CourseApi, validateUploadFile } from './courses-api.ts'

// A grade and its uploads are separate requests; report partial upload failures without resending successful files.
export async function saveGradeWithFiles(api: CourseApi, solutionId: number, data: FormData): Promise<string[]> {
  const files = data.getAll('gradeFiles').filter((value): value is File => value instanceof File && value.name !== '')
  files.forEach(validateUploadFile)
  await api.request(`/solutions/${solutionId}/grade`, 'PUT', {
    grade: data.get('grade') === 'true',
    teacherComment: String(data.get('teacherComment') ?? '').trim() || null,
  })
  const failures: string[] = []
  for (const file of files) {
    try { await api.upload('GRADE', solutionId, file) }
    catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Ошибка загрузки'}`) }
  }
  return failures
}
