package ru.niksen111.repitma.courses.controller

import java.time.Clock
import java.time.LocalDateTime
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.courses.dto.ScheduledLessonResponse
import ru.niksen111.repitma.courses.dto.toResponse
import ru.niksen111.repitma.courses.mapper.LessonMapper
import ru.niksen111.repitma.courses.service.CourseService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
class ScheduleController(
    private val courses: CourseService,
    private val lessons: LessonMapper,
    private val clock: Clock,
) {
    @GetMapping("/api/schedule")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    fun schedule(@CurrentUsername username: String): List<ScheduledLessonResponse> {
        val now = LocalDateTime.now(clock)
        return courses.courses(username).flatMap { course ->
            lessons.findByCourse(course.id).map { lesson ->
                ScheduledLessonResponse(
                    course.id, course.academicYear, course.username, course.name,
                    lesson.toResponse(now), lessons.findReceipts(requireNotNull(lesson.id)),
                )
            }
        }.sortedWith(compareByDescending<ScheduledLessonResponse> { it.lesson.scheduledAt }
            .thenByDescending { it.lesson.id }
        )
    }
}
