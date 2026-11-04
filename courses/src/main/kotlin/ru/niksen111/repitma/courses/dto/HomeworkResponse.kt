package ru.niksen111.repitma.courses.dto

data class HomeworkResponse(
    val courseId: Long,
    val academicYear: String,
    val studentUsername: String,
    val studentName: String?,
    val teacherUsername: String,
    val teacherName: String?,
    val lessonId: Long,
    val lessonTitle: String,
    val scheduledAt: String,
    val taskId: Long,
    val taskTitle: String,
    val description: String?,
)
