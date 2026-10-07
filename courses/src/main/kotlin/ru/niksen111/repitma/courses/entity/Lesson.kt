package ru.niksen111.repitma.courses.entity

data class Lesson(
    var id: Long? = null,
    val courseId: Long,
    val title: String,
    val description: String?,
    val scheduledAt: String,
    val outcome: LessonOutcome = LessonOutcome.AUTO,
    val paid: Boolean = false,
)
