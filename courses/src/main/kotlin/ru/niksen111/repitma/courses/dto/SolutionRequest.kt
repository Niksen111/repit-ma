package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.Size

data class SolutionRequest(
    @field:Size(max = 10_000)
    val description: String? = null,
)
