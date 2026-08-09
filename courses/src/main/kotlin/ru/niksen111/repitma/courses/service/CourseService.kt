package ru.niksen111.repitma.courses.service

import org.springframework.stereotype.Service
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class CourseService(
    private val userMapper: UserMapper,
    private val courseMapper: CourseMapper,
) {
    fun courses(username: String): List<CourseResponse> {
        val account = account(username)
        return if (account.role == UserRole.ADMIN) {
            courseMapper.findAll()
        } else {
            courseMapper.findForUser(requireNotNull(account.id))
        }
    }

    fun course(username: String, courseId: Long): CourseResponse? {
        val account = account(username)
        val course = courseMapper.findById(courseId) ?: return null
        val accountId = requireNotNull(account.id)
        return course.takeIf {
            account.role == UserRole.ADMIN || it.teacherId == accountId || it.studentId == accountId
        }
    }

    private fun account(username: String): UserAccount = requireNotNull(userMapper.findByUsername(username))
}
