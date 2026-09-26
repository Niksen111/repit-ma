package ru.niksen111.repitma.courses.dto

import ru.niksen111.repitma.courses.entity.Lesson

data class LessonResponse(
    val id: Long,
    val title: String,
    val description: String?,
    val scheduledAt: String,
)

fun Lesson.toResponse() = LessonResponse(
    id = requireNotNull(id),
    title = title,
    description = description,
    scheduledAt = scheduledAt,
)
