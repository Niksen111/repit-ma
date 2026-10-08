package ru.niksen111.repitma.courses.entity

data class RecurringLessonSlot(
    var id: Long? = null,
    val scheduleId: Long,
    val dayOfWeek: Int,
    val startTime: String,
)
