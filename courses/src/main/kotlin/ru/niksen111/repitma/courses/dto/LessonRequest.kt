package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class LessonRequest(
    @field:NotBlank
    @field:Size(max = 200)
    val title: String,
    @field:Size(max = 10_000)
    val description: String? = null,
    @field:NotBlank
    @field:Size(max = 40)
    val scheduledAt: String,
)
