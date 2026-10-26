package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.Size

data class TeacherNote(
    @field:Size(max = 10_000)
    val note: String,
)
