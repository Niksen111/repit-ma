package ru.niksen111.repitma.courses.service

import org.springframework.http.HttpStatus
import org.springframework.http.InvalidMediaTypeException
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.annotation.Propagation
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.FileOwnerType
import ru.niksen111.repitma.courses.dto.FileResponse
import ru.niksen111.repitma.courses.entity.CourseFile
import ru.niksen111.repitma.courses.mapper.FileMapper
import ru.niksen111.repitma.courses.mapper.LessonMapper
import ru.niksen111.repitma.courses.mapper.SolutionMapper
import ru.niksen111.repitma.courses.mapper.TaskMapper

@Service
class FileService(
    private val access: CourseAccessService,
    private val fileMapper: FileMapper,
    private val lessonMapper: LessonMapper,
    private val taskMapper: TaskMapper,
    private val solutionMapper: SolutionMapper,
) {
    fun list(
        username: String,
        courseId: Long,
        type: FileOwnerType,
        ownerId: Long,
    ): List<FileResponse> {
        access.requireReader(username, courseId)
        requireOwner(courseId, type, ownerId)
        return when (type) {
            FileOwnerType.LESSON -> lessonMapper.findFiles(ownerId)
            FileOwnerType.TASK -> taskMapper.findFiles(ownerId)
            FileOwnerType.SOLUTION -> solutionMapper.findFiles(ownerId)
        }
    }

    @Transactional
    fun upload(
        username: String,
        courseId: Long,
        type: FileOwnerType,
        ownerId: Long,
        upload: MultipartFile,
    ): FileResponse {
        requireWriteAccess(username, courseId, type, ownerId)
        if (upload.isEmpty || upload.size > MAX_SIZE) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Файл должен быть непустым и не больше 25 МБ",
            )
        }
        val file = CourseFile(
            originalName = safeFilename(upload.originalFilename),
            contentType = safeContentType(upload.contentType),
            content = upload.bytes,
        )
        fileMapper.insert(file)
        val fileId = requireNotNull(file.id)
        when (type) {
            FileOwnerType.LESSON -> lessonMapper.attachFile(ownerId, fileId)
            FileOwnerType.TASK -> taskMapper.attachFile(ownerId, fileId)
            FileOwnerType.SOLUTION -> solutionMapper.attachFile(ownerId, fileId)
        }
        return FileResponse(fileId, file.originalName, file.contentType)
    }

    fun download(
        username: String,
        courseId: Long,
        type: FileOwnerType,
        ownerId: Long,
        fileId: Long,
    ): CourseFile {
        access.requireReader(username, courseId)
        requireOwner(courseId, type, ownerId)
        requireAttachment(type, ownerId, fileId)
        return fileMapper.findById(fileId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
    }

    @Transactional
    fun delete(
        username: String,
        courseId: Long,
        type: FileOwnerType,
        ownerId: Long,
        fileId: Long,
    ) {
        requireWriteAccess(username, courseId, type, ownerId)
        requireAttachment(type, ownerId, fileId)
        detach(type, ownerId, fileId)
        fileMapper.deleteIfUnreferenced(fileId)
    }

    @Transactional(propagation = Propagation.MANDATORY)
    internal fun deleteAttachments(type: FileOwnerType, ownerId: Long) {
        val files = when (type) {
            FileOwnerType.LESSON -> lessonMapper.findFiles(ownerId)
            FileOwnerType.TASK -> taskMapper.findFiles(ownerId)
            FileOwnerType.SOLUTION -> solutionMapper.findFiles(ownerId)
        }
        for (file in files) {
            detach(type, ownerId, file.id)
            fileMapper.deleteIfUnreferenced(file.id)
        }
    }

    private fun detach(type: FileOwnerType, ownerId: Long, fileId: Long) {
        when (type) {
            FileOwnerType.LESSON -> lessonMapper.detachFile(ownerId, fileId)
            FileOwnerType.TASK -> taskMapper.detachFile(ownerId, fileId)
            FileOwnerType.SOLUTION -> solutionMapper.detachFile(ownerId, fileId)
        }
    }

    private fun requireWriteAccess(
        username: String,
        courseId: Long,
        type: FileOwnerType,
        ownerId: Long,
    ) {
        when (type) {
            FileOwnerType.LESSON -> {
                access.requireTeacher(username, courseId)
                access.lesson(courseId, ownerId)
            }
            FileOwnerType.TASK -> {
                access.requireTeacher(username, courseId)
                access.task(courseId, ownerId)
            }
            FileOwnerType.SOLUTION -> {
                access.requireStudent(username, courseId)
                val solution = access.solution(courseId, ownerId)
                if (solution.grade != null) {
                    throw ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Файлы оценённого решения нельзя изменять",
                    )
                }
            }
        }
    }

    private fun requireOwner(courseId: Long, type: FileOwnerType, ownerId: Long) {
        when (type) {
            FileOwnerType.LESSON -> access.lesson(courseId, ownerId)
            FileOwnerType.TASK -> access.task(courseId, ownerId)
            FileOwnerType.SOLUTION -> access.solution(courseId, ownerId)
        }
    }

    private fun requireAttachment(type: FileOwnerType, ownerId: Long, fileId: Long) {
        val attached = when (type) {
            FileOwnerType.LESSON -> lessonMapper.containsFile(ownerId, fileId)
            FileOwnerType.TASK -> taskMapper.containsFile(ownerId, fileId)
            FileOwnerType.SOLUTION -> solutionMapper.containsFile(ownerId, fileId)
        }
        if (!attached) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND)
        }
    }

    private fun safeFilename(value: String?): String =
        value.orEmpty()
            .replace('\\', '/')
            .substringAfterLast('/')
            .filterNot { it.isISOControl() }
            .trim()
            .take(255)
            .ifBlank { "file" }

    private fun safeContentType(value: String?): String {
        try {
            val type = MediaType.parseMediaType(value ?: MediaType.APPLICATION_OCTET_STREAM_VALUE)
            return if (type.isWildcardType || type.isWildcardSubtype) {
                MediaType.APPLICATION_OCTET_STREAM_VALUE
            } else {
                type.toString()
            }
        } catch (_: InvalidMediaTypeException) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE
        }
    }

    private companion object {
        const val MAX_SIZE = 25L * 1024 * 1024
    }
}
