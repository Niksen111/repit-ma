package ru.niksen111.repitma.courses.dto

import ru.niksen111.repitma.courses.entity.Task

data class TaskResponse(
    val id: Long,
    val lessonId: Long,
    val title: String,
    val description: String?,
)

fun Task.toResponse() = TaskResponse(
    id = requireNotNull(id),
    lessonId = lessonId,
    title = title,
    description = description,
)
