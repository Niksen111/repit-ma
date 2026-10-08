package ru.niksen111.repitma.courses.dto

import ru.niksen111.repitma.courses.entity.Lesson
import ru.niksen111.repitma.courses.entity.LessonOutcome
import ru.niksen111.repitma.courses.entity.LessonStatus
import java.time.LocalDateTime

data class LessonResponse(
    val id: Long,
    val title: String,
    val description: String?,
    val scheduledAt: String,
    val status: LessonStatus,
    val paid: Boolean,
    val recurringScheduleId: Long?,
)

fun Lesson.toResponse(now: LocalDateTime) = LessonResponse(
    id = requireNotNull(id),
    title = title,
    description = description,
    scheduledAt = scheduledAt,
    status = when (outcome) {
        LessonOutcome.HELD -> LessonStatus.HELD
        LessonOutcome.CANCELLED -> LessonStatus.CANCELLED
        LessonOutcome.AUTO -> if (LocalDateTime.parse(scheduledAt)
                .isAfter(now)
        ) LessonStatus.SCHEDULED else LessonStatus.PAST
    },
    paid = paid,
    recurringScheduleId = recurringScheduleId,
)
