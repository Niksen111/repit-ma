package ru.niksen111.repitma.courses.controller

import java.nio.charset.StandardCharsets
import org.springframework.http.CacheControl
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.niksen111.repitma.courses.dto.FileOwnerType
import ru.niksen111.repitma.courses.dto.FileResponse
import ru.niksen111.repitma.courses.service.FileService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/courses/{courseId}/files")
@PreAuthorize("isAuthenticated()")
class FilesController(
    private val fileService: FileService,
) {
    @GetMapping
    fun files(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @RequestParam ownerType: FileOwnerType,
        @RequestParam ownerId: Long,
    ): List<FileResponse> = fileService.list(username, courseId, ownerType, ownerId)

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @RequestParam ownerType: FileOwnerType,
        @RequestParam ownerId: Long,
        @RequestParam file: MultipartFile,
    ): FileResponse = fileService.upload(username, courseId, ownerType, ownerId, file)

    @GetMapping("/{fileId}")
    fun download(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable fileId: Long,
        @RequestParam ownerType: FileOwnerType,
        @RequestParam ownerId: Long,
    ): ResponseEntity<ByteArray> {
        val file = fileService.download(username, courseId, ownerType, ownerId, fileId)
        val disposition = ContentDisposition.attachment()
            .filename(file.originalName, StandardCharsets.UTF_8)
            .build()
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .contentLength(file.content.size.toLong())
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .body(file.content)
    }

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @CurrentUsername username: String,
        @PathVariable courseId: Long,
        @PathVariable fileId: Long,
        @RequestParam ownerType: FileOwnerType,
        @RequestParam ownerId: Long,
    ) {
        fileService.delete(username, courseId, ownerType, ownerId, fileId)
    }
}
