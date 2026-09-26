package ru.niksen111.repitma.courses.service

import java.time.Instant
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.SolutionGradeRequest
import ru.niksen111.repitma.courses.dto.SolutionRequest
import ru.niksen111.repitma.courses.dto.SolutionResponse
import ru.niksen111.repitma.courses.dto.toResponse
import ru.niksen111.repitma.courses.entity.Solution
import ru.niksen111.repitma.courses.mapper.SolutionMapper

@Service
class SolutionService(
    private val access: CourseAccessService,
    private val solutionMapper: SolutionMapper,
) {
    fun findForTask(username: String, courseId: Long, taskId: Long): SolutionResponse? {
        access.requireReader(username, courseId)
        access.task(courseId, taskId)
        return solutionMapper.findByTask(taskId)?.toResponse()
    }

    @Transactional
    fun create(
        username: String,
        courseId: Long,
        taskId: Long,
        request: SolutionRequest,
    ): SolutionResponse {
        access.requireStudent(username, courseId)
        access.task(courseId, taskId)
        val solution = Solution(
            taskId = taskId,
            description = request.description?.trim()?.ifBlank { null },
        )
        if (solutionMapper.insert(solution) != 1) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Решение уже отправлено")
        }
        return solution.toResponse()
    }

    @Transactional
    fun update(
        username: String,
        courseId: Long,
        solutionId: Long,
        request: SolutionRequest,
    ): SolutionResponse {
        access.requireStudent(username, courseId)
        val solution = access.solution(courseId, solutionId).copy(
            description = request.description?.trim()?.ifBlank { null },
        )
        if (solutionMapper.update(solution) != 1) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Оценённое решение нельзя редактировать")
        }
        return solution.toResponse()
    }

    @Transactional
    fun grade(
        username: String,
        courseId: Long,
        solutionId: Long,
        request: SolutionGradeRequest,
    ): SolutionResponse {
        access.requireTeacher(username, courseId)
        val solution = access.solution(courseId, solutionId).copy(
            grade = requireNotNull(request.grade),
            teacherComment = request.teacherComment?.trim()?.ifBlank { null },
            gradedAt = Instant.now().toString(),
        )
        solutionMapper.grade(solution)
        return solution.toResponse()
    }
}
