package ru.niksen111.repitma.courses.entity

data class RecurringLessonSchedule(
    var id: Long? = null,
    val courseId: Long,
    val title: String,
    val description: String?,
    val startDate: String,
    val endDate: String?,
    val active: Boolean = true,
)
