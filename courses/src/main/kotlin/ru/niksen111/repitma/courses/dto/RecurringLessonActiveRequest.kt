package ru.niksen111.repitma.courses.dto

data class RecurringLessonActiveRequest(
    val active: Boolean,
    val cancelUpcoming: Boolean = false,
)
