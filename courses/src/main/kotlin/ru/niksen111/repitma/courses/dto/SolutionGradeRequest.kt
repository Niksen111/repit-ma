package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

data class SolutionGradeRequest(
    @field:NotNull
    val grade: Boolean?,
    @field:Size(max = 10_000)
    val teacherComment: String? = null,
)
