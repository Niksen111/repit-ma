package ru.niksen111.repitma.users.controller

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.users.dto.TeacherSummaryResponse
import ru.niksen111.repitma.users.service.TeacherDirectoryService

@RestController
@RequestMapping("/api/teachers")
@PreAuthorize("hasRole('ADMIN')")
class TeachersController(
    private val teacherDirectoryService: TeacherDirectoryService,
) {
    @GetMapping
    fun teachers(): List<TeacherSummaryResponse> = teacherDirectoryService.teachers()
}
