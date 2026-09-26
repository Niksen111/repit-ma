package ru.niksen111.repitma.courses.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.niksen111.repitma.courses.dto.FileOwnerType
import ru.niksen111.repitma.courses.dto.TaskRequest
import ru.niksen111.repitma.courses.dto.TaskResponse
import ru.niksen111.repitma.courses.dto.toResponse
import ru.niksen111.repitma.courses.entity.Task
import ru.niksen111.repitma.courses.mapper.SolutionMapper
import ru.niksen111.repitma.courses.mapper.TaskMapper

@Service
class TaskService(
    private val access: CourseAccessService,
    private val taskMapper: TaskMapper,
    private val solutionMapper: SolutionMapper,
    private val fileService: FileService,
) {
    fun list(username: String, courseId: Long, lessonId: Long): List<TaskResponse> {
        access.requireReader(username, courseId)
        access.lesson(courseId, lessonId)
        return taskMapper.findByLesson(lessonId).map { it.toResponse() }
    }

    @Transactional
    fun create(
        username: String,
        courseId: Long,
        lessonId: Long,
        request: TaskRequest,
    ): TaskResponse {
        access.requireTeacher(username, courseId)
        access.lesson(courseId, lessonId)
        val task = Task(
            lessonId = lessonId,
            title = request.title.trim(),
            description = request.description?.trim()?.ifBlank { null },
        )
        taskMapper.insert(task)
        return task.toResponse()
    }

    @Transactional
    fun update(
        username: String,
        courseId: Long,
        taskId: Long,
        request: TaskRequest,
    ): TaskResponse {
        access.requireTeacher(username, courseId)
        val task = access.task(courseId, taskId).copy(
            title = request.title.trim(),
            description = request.description?.trim()?.ifBlank { null },
        )
        taskMapper.update(task)
        return task.toResponse()
    }

    @Transactional
    fun delete(username: String, courseId: Long, taskId: Long) {
        access.requireTeacher(username, courseId)
        access.task(courseId, taskId)
        solutionMapper.findByTask(taskId)?.let { solution ->
            val solutionId = requireNotNull(solution.id)
            fileService.deleteAttachments(FileOwnerType.SOLUTION, solutionId)
            solutionMapper.delete(solutionId)
        }
        fileService.deleteAttachments(FileOwnerType.TASK, taskId)
        taskMapper.delete(taskId)
    }
}
