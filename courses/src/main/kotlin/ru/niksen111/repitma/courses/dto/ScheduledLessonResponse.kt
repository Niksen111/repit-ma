package ru.niksen111.repitma.courses.dto

data class ScheduledLessonResponse(
    val courseId: Long,
    val academicYear: String,
    val studentUsername: String,
    val studentName: String?,
    val lesson: LessonResponse,
    val receipts: List<FileResponse>,
)
