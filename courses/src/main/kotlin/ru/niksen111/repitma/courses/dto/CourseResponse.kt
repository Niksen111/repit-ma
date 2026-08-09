package ru.niksen111.repitma.courses.dto

data class CourseResponse(
    val id: Long,
    val academicYear: String,
    val teacherId: Long,
    val teacherUsername: String,
    val teacherName: String?,
    val teacherCity: String?,
    val teacherTelegram: String?,
    val teacherVk: String?,
    val studentId: Long,
    val username: String,
    val name: String?,
    val city: String?,
    val telegram: String?,
    val vk: String?,
    val grade: Int?,
)
