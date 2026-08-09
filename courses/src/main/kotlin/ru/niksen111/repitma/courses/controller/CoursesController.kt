package ru.niksen111.repitma.courses.controller

import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.courses.service.CourseService

@RestController
@RequestMapping("/api/courses")
@PreAuthorize("isAuthenticated()")
class CoursesController(
    private val courseService: CourseService,
) {
    @GetMapping
    fun courses(authentication: Authentication): List<CourseResponse> =
        courseService.courses(authentication.name)

    @GetMapping("/{courseId}")
    fun course(
        authentication: Authentication,
        @PathVariable courseId: Long,
    ): CourseResponse = courseService.course(authentication.name, courseId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
}
