package ru.niksen111.repitma.courses.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Pattern

data class RecurringLessonSlotRequest(
    @Min(1) @Max(7)
    val dayOfWeek: Int,
    @Pattern(regexp = "\\d{2}:\\d{2}")
    val startTime: String,
)
