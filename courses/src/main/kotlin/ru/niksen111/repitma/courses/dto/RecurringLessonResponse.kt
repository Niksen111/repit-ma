package ru.niksen111.repitma.courses.dto

data class RecurringLessonResponse(
    val id: Long,
    val courseId: Long,
    val title: String,
    val description: String?,
    val startDate: String,
    val endDate: String?,
    val active: Boolean,
    val slots: List<RecurringLessonSlotRequest>,
)
