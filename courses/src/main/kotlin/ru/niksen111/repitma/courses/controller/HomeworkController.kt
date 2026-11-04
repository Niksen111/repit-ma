package ru.niksen111.repitma.courses.controller

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.courses.dto.HomeworkResponse
import ru.niksen111.repitma.courses.service.HomeworkService
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
class HomeworkController(private val homework: HomeworkService) {
    @GetMapping("/api/homework")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    fun pending(@CurrentUsername username: String): List<HomeworkResponse> = homework.pending(username)
}
