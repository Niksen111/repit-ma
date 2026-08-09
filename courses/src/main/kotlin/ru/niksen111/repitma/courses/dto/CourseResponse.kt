package ru.niksen111.repitma.courses.dto

data class CourseResponse(
    val id: Long,
    val academicYear: String,
    val teacherId: Long,
    val studentId: Long,
    val username: String,
    val name: String?,
    val city: String?,
    val telegram: String?,
    val vk: String?,
    val grade: Int?,
)
