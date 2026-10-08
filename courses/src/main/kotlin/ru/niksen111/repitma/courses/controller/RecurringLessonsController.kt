package ru.niksen111.repitma.courses.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.courses.dto.RecurringLessonActiveRequest
import ru.niksen111.repitma.courses.dto.RecurringLessonRequest
import ru.niksen111.repitma.courses.dto.RecurringLessonResponse
import ru.niksen111.repitma.courses.service.RecurringLessonService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses/{courseId}/recurring-lessons")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
class RecurringLessonsController(private val service: RecurringLessonService) {
    @GetMapping
    fun list(@CurrentUsername username: String, @PathVariable courseId: Long): List<RecurringLessonResponse> =
        service.list(username, courseId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @Valid @RequestBody request: RecurringLessonRequest
    ): RecurringLessonResponse =
        service.create(username, courseId, request)

    @PutMapping("/{scheduleId}")
    fun update(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable scheduleId: Long,
        @Valid @RequestBody request: RecurringLessonRequest
    ): RecurringLessonResponse =
        service.update(username, courseId, scheduleId, request)

    @PutMapping("/{scheduleId}/active")
    fun setActive(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable scheduleId: Long,
        @RequestBody request: RecurringLessonActiveRequest
    ): RecurringLessonResponse =
        service.setActive(username, courseId, scheduleId, request)
}
