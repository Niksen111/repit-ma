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
import ru.niksen111.repitma.courses.dto.SolutionGradeRequest
import ru.niksen111.repitma.courses.dto.SolutionRequest
import ru.niksen111.repitma.courses.dto.SolutionResponse
import ru.niksen111.repitma.courses.service.SolutionService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses/{courseId}")
@PreAuthorize("isAuthenticated()")
class SolutionsController(
    private val solutionService: SolutionService,
) {
    @GetMapping("/tasks/{taskId}/solution")
    fun solution(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable taskId: Long,
    ): SolutionResponse? = solutionService.findForTask(username, courseId, taskId)

    @PostMapping("/tasks/{taskId}/solution")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: SolutionRequest,
    ): SolutionResponse = solutionService.create(username, courseId, taskId, request)

    @PutMapping("/solutions/{solutionId}")
    fun update(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable solutionId: Long,
        @Valid @RequestBody request: SolutionRequest,
    ): SolutionResponse = solutionService.update(username, courseId, solutionId, request)

    @PutMapping("/solutions/{solutionId}/grade")
    fun grade(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable solutionId: Long,
        @Valid @RequestBody request: SolutionGradeRequest,
    ): SolutionResponse = solutionService.grade(username, courseId, solutionId, request)
}
