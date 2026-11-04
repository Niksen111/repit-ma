package ru.niksen111.repitma.courses.service

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.HomeworkResponse
import ru.niksen111.repitma.courses.mapper.HomeworkMapper
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class HomeworkService(
    private val users: UserMapper,
    private val homework: HomeworkMapper,
) {
    fun pending(username: String): List<HomeworkResponse> {
        val account = users.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        return when (account.role) {
            UserRole.STUDENT -> homework.findAwaitingSubmission(requireNotNull(account.id))
            UserRole.TEACHER -> homework.findAwaitingReview(requireNotNull(account.id))
            UserRole.ADMIN -> homework.findAwaitingReview(null)
        }
    }
}
