package ru.niksen111.repitma.courses.controller

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.courses.service.CourseService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses")
@PreAuthorize("isAuthenticated()")
class CoursesController(
    private val courseService: CourseService,
) {
    @GetMapping
    fun courses(@CurrentUsername username: String): List<CourseResponse> =
        courseService.courses(username)

    @GetMapping("/{courseId}")
    fun course(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
    ): CourseResponse = courseService.course(username, courseId)
}
