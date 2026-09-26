package ru.niksen111.repitma.courses.dto

import ru.niksen111.repitma.courses.entity.Solution

data class SolutionResponse(
    val id: Long,
    val taskId: Long,
    val description: String?,
    val grade: Boolean?,
    val teacherComment: String?,
    val gradedAt: String?,
)

fun Solution.toResponse() = SolutionResponse(
    id = requireNotNull(id),
    taskId = taskId,
    description = description,
    grade = grade,
    teacherComment = teacherComment,
    gradedAt = gradedAt,
)
