package ru.niksen111.repitma.users.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import ru.niksen111.repitma.users.dto.RegistrationRequest
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class UserRegistrationService(
    private val userMapper: UserMapper,
    private val passwordEncoder: PasswordEncoder,
) {
    fun create(request: RegistrationRequest): UserAccount {
        val user = UserAccount(
            username = request.username,
            passwordHash = passwordEncoder.encode(request.password)!!,
            role = request.role,
        )

        try {
            check(userMapper.insert(user) == 1) { "User was not created" }
        } catch (_: DataIntegrityViolationException) {
            throw UsernameAlreadyExistsException(request.username)
        }

        requireNotNull(user.id) { "Generated user id is missing" }
        return user
    }
}
