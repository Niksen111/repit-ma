package ru.niksen111.repitma.courses.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RecurringLessonRequest(
    @Valid @Size(min = 1, max = 21)
    val slots: List<RecurringLessonSlotRequest>,
    @NotBlank @Size(max = 200)
    val title: String = "Занятие по расписанию",
    @Size(max = 10_000)
    val description: String? = "Регулярное занятие по недельному расписанию.",
    @Size(max = 10)
    val startDate: String? = null,
    @Size(max = 10)
    val endDate: String? = null,
)
