package ru.niksen111.repitma.courses.service

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class CourseService(
    private val userMapper: UserMapper,
    private val courseMapper: CourseMapper,
    private val access: CourseAccessService,
) {
    fun courses(username: String): List<CourseResponse> {
        val account = account(username)
        return if (account.role == UserRole.ADMIN) {
            courseMapper.findAll()
        } else {
            courseMapper.findForUser(requireNotNull(account.id))
        }
    }

    fun course(username: String, courseId: Long): CourseResponse =
        access.requireReader(username, courseId)

    private fun account(username: String): UserAccount =
        userMapper.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
}
