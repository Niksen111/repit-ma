package ru.niksen111.repitma.courses.service

import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.niksen111.repitma.courses.entity.Lesson
import ru.niksen111.repitma.courses.mapper.LessonMapper
import ru.niksen111.repitma.courses.mapper.RecurringLessonMapper

@Service
class RecurringLessonGenerator(
    private val schedules: RecurringLessonMapper,
    private val lessons: LessonMapper,
    private val clock: Clock,
) {
    @Transactional
    fun generate(scheduleId: Long): Int {
        val schedule = schedules.findById(scheduleId) ?: return 0
        if (!schedule.active) return 0
        val now = LocalDateTime.now(clock)
        val until = now.plusDays(7)
        val startDate = LocalDate.parse(schedule.startDate)
        val endDate = schedule.endDate?.let(LocalDate::parse)
        var created = 0
        for (slot in schedules.findSlots(scheduleId)) {
            val slotId = requireNotNull(slot.id)
            for (offset in 0L..7L) {
                val day = now.toLocalDate().plusDays(offset)
                if (day.dayOfWeek.value != slot.dayOfWeek || day < startDate || (endDate != null && day > endDate)) continue
                val dateTime = day.atTime(LocalTime.parse(slot.startTime))
                if (dateTime < now || dateTime >= until) continue
                val scheduledAt = dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                // The claim and lesson are committed together. Never regenerate a moved/deleted occurrence.
                if (schedules.reserveOccurrence(slotId, scheduledAt) == 0) continue
                val existing = lessons.findAt(schedule.courseId, scheduledAt)
                val lessonId = if (existing != null) {
                    requireNotNull(existing.id)
                } else {
                    val lesson = Lesson(
                        courseId = schedule.courseId,
                        title = schedule.title,
                        description = schedule.description,
                        scheduledAt = scheduledAt,
                        recurringScheduleId = scheduleId,
                    )
                    lessons.insert(lesson)
                    created++
                    requireNotNull(lesson.id)
                }
                schedules.linkOccurrence(slotId, scheduledAt, lessonId)
            }
        }
        return created
    }
}
