package ru.niksen111.repitma.courses.dto

import ru.niksen111.repitma.courses.entity.LessonOutcome

data class LessonTrackingRequest(
    val outcome: LessonOutcome? = null,
    val paid: Boolean? = null,
)
