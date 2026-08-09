package ru.niksen111.repitma.registration

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import ru.niksen111.repitma.users.dto.RegistrationRequest
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.users.mapper.UserMapper
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.users.service.UserRegistrationService
import java.util.concurrent.ConcurrentHashMap
import kotlin.test.assertEquals

class RegistrationFacadeTests {
    private val userMapper = FakeUserMapper().apply {
        insert(UserAccount(username = "admin", passwordHash = "hash", role = UserRole.ADMIN))
    }
    private val service = RegistrationFacade(
        userMapper,
        UserRegistrationService(userMapper, BCryptPasswordEncoder()),
        FakeCourseMapper(),
    )

    @Test
    fun `preserves the username`() {
        val response = service.register(RegistrationRequest("New.User", "password123", UserRole.TEACHER), "admin")

        assertEquals("New.User", response.username)
        assertEquals(UserRole.TEACHER, response.role)
    }

    @Test
    fun `rejects a duplicate username ignoring case`() {
        service.register(RegistrationRequest("new-user", "password123", UserRole.STUDENT), "admin")

        assertThrows<UsernameAlreadyExistsException> {
            service.register(RegistrationRequest("NEW-USER", "another-password", UserRole.STUDENT), "admin")
        }
    }
}

private class FakeUserMapper : UserMapper {
    private val users = ConcurrentHashMap<String, UserAccount>()
    private var nextId = 1L

    override fun insert(user: UserAccount): Int {
        if (users.putIfAbsent(user.username.lowercase(), user) != null) {
            throw DataIntegrityViolationException("Username already exists")
        }
        user.id = nextId++
        return 1
    }

    override fun findByUsername(username: String): UserAccount? = users[username.lowercase()]

    override fun findById(id: Long): UserAccount? = users.values.firstOrNull { it.id == id }

    override fun findByRole(role: UserRole): List<UserAccount> = users.values.filter { it.role == role }

    override fun updateProfile(
        id: Long,
        name: String?,
        telegram: String?,
        city: String?,
        vk: String?,
        grade: Int?,
        profileConsentAt: String?,
    ): Int = error("Not used in registration tests")
}

private class FakeCourseMapper : CourseMapper {
    override fun insert(teacherId: Long, studentId: Long, academicYear: String): Int = 1
    override fun findAll(): List<CourseResponse> = emptyList()
    override fun findForUser(userId: Long): List<CourseResponse> = emptyList()
    override fun findById(courseId: Long): CourseResponse? = null
}

