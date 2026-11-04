package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.NotNull

data class TaskCompletionRequest(
    @field:NotNull
    val completed: Boolean?,
)
