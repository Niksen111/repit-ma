package ru.niksen111.repitma.auth.service

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import ru.niksen111.repitma.auth.dto.RegistrationRequest
import ru.niksen111.repitma.auth.entity.UserAccount
import ru.niksen111.repitma.auth.entity.UserRole
import ru.niksen111.repitma.auth.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.auth.mapper.UserMapper
import java.util.concurrent.ConcurrentHashMap
import kotlin.test.assertEquals

class RegistrationServiceTests {
    private val service = RegistrationService(FakeUserMapper(), BCryptPasswordEncoder())

    @Test
    fun `preserves the username`() {
        val response = service.register(RegistrationRequest("New.User", "password123", UserRole.TEACHER))

        assertEquals("New.User", response.username)
        assertEquals(UserRole.TEACHER, response.role)
    }

    @Test
    fun `rejects a duplicate username ignoring case`() {
        service.register(RegistrationRequest("new-user", "password123", UserRole.STUDENT))

        assertThrows<UsernameAlreadyExistsException> {
            service.register(RegistrationRequest("NEW-USER", "another-password", UserRole.STUDENT))
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
