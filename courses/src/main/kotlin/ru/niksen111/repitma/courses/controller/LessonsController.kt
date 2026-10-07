package ru.niksen111.repitma.courses.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.courses.dto.LessonRequest
import ru.niksen111.repitma.courses.dto.LessonResponse
import ru.niksen111.repitma.courses.dto.LessonTrackingRequest
import ru.niksen111.repitma.courses.service.LessonService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses/{courseId}")
@PreAuthorize("isAuthenticated()")
class LessonsController(
    private val lessonService: LessonService,
) {
    @GetMapping("/lessons")
    fun lessons(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
    ): List<LessonResponse> = lessonService.list(username, courseId)

    @PostMapping("/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @Valid @RequestBody request: LessonRequest,
    ): LessonResponse = lessonService.create(username, courseId, request)

    @PutMapping("/lessons/{lessonId}")
    fun update(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
        @Valid @RequestBody request: LessonRequest,
    ): LessonResponse = lessonService.update(username, courseId, lessonId, request)

    @PutMapping("/lessons/{lessonId}/tracking")
    fun track(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
        @RequestBody request: LessonTrackingRequest,
    ): LessonResponse = lessonService.track(username, courseId, lessonId, request)

    @DeleteMapping("/lessons/{lessonId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
    ) {
        lessonService.delete(username, courseId, lessonId)
    }
}
