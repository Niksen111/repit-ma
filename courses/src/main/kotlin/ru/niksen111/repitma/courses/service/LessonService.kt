package ru.niksen111.repitma.courses.service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.LessonRequest
import ru.niksen111.repitma.courses.dto.FileOwnerType
import ru.niksen111.repitma.courses.dto.LessonResponse
import ru.niksen111.repitma.courses.dto.toResponse
import ru.niksen111.repitma.courses.entity.Lesson
import ru.niksen111.repitma.courses.mapper.LessonMapper
import ru.niksen111.repitma.courses.mapper.TaskMapper

@Service
class LessonService(
    private val access: CourseAccessService,
    private val lessonMapper: LessonMapper,
    private val taskMapper: TaskMapper,
    private val taskService: TaskService,
    private val fileService: FileService,
) {
    fun list(username: String, courseId: Long): List<LessonResponse> {
        access.requireReader(username, courseId)
        return lessonMapper.findByCourse(courseId).map { it.toResponse() }
    }

    @Transactional
    fun create(username: String, courseId: Long, request: LessonRequest): LessonResponse {
        access.requireTeacher(username, courseId)
        val lesson = Lesson(
            courseId = courseId,
            title = request.title.trim(),
            description = request.description?.trim()?.ifBlank { null },
            scheduledAt = normalizeDate(request.scheduledAt),
        )
        lessonMapper.insert(lesson)
        return lesson.toResponse()
    }

    @Transactional
    fun update(
        username: String,
        courseId: Long,
        lessonId: Long,
        request: LessonRequest,
    ): LessonResponse {
        access.requireTeacher(username, courseId)
        val lesson = access.lesson(courseId, lessonId).copy(
            title = request.title.trim(),
            description = request.description?.trim()?.ifBlank { null },
            scheduledAt = normalizeDate(request.scheduledAt),
        )
        lessonMapper.update(lesson)
        return lesson.toResponse()
    }

    @Transactional
    fun delete(username: String, courseId: Long, lessonId: Long) {
        access.requireTeacher(username, courseId)
        access.lesson(courseId, lessonId)
        for (task in taskMapper.findByLesson(lessonId)) {
            taskService.delete(username, courseId, requireNotNull(task.id))
        }
        fileService.deleteAttachments(FileOwnerType.LESSON, lessonId)
        lessonMapper.delete(lessonId)
    }

    private fun normalizeDate(value: String): String {
        try {
            return LocalDateTime.parse(value).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Дата занятия должна быть в формате ISO, например 2026-09-01T16:00",
            )
        }
    }
}
