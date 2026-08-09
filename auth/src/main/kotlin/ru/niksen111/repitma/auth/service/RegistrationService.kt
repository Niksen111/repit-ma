package ru.niksen111.repitma.auth.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import ru.niksen111.repitma.auth.dto.RegistrationRequest
import ru.niksen111.repitma.auth.dto.RegistrationResponse
import ru.niksen111.repitma.auth.entity.UserAccount
import ru.niksen111.repitma.auth.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.auth.mapper.UserMapper

@Service
class RegistrationService(
    private val userMapper: UserMapper,
    private val passwordEncoder: PasswordEncoder,
) {

    fun register(request: RegistrationRequest): RegistrationResponse {
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

        return RegistrationResponse(
            id = requireNotNull(user.id) { "Generated user id is missing" },
            username = user.username,
            role = user.role,
        )
    }
}
