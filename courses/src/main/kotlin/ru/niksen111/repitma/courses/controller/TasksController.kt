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
import ru.niksen111.repitma.courses.dto.TaskRequest
import ru.niksen111.repitma.courses.dto.TaskResponse
import ru.niksen111.repitma.courses.service.TaskService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses/{courseId}")
@PreAuthorize("isAuthenticated()")
class TasksController(
    private val taskService: TaskService,
) {
    @GetMapping("/lessons/{lessonId}/tasks")
    fun tasks(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
    ): List<TaskResponse> = taskService.list(username, courseId, lessonId)

    @PostMapping("/lessons/{lessonId}/tasks", "/lessons/{lessonId}/task")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
        @Valid @RequestBody request: TaskRequest,
    ): TaskResponse = taskService.create(username, courseId, lessonId, request)

    @PutMapping("/tasks/{taskId}")
    fun update(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: TaskRequest,
    ): TaskResponse = taskService.update(username, courseId, taskId, request)

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable taskId: Long,
    ) {
        taskService.delete(username, courseId, taskId)
    }
}
