package ru.niksen111.repitma.registration

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.niksen111.repitma.users.dto.RegistrationRequest
import ru.niksen111.repitma.users.dto.RegistrationResponse
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.exception.ValidationException
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.users.mapper.UserMapper
import ru.niksen111.repitma.users.service.UserRegistrationService

@Service
class RegistrationFacade(
    private val userMapper: UserMapper,
    private val userRegistrationService: UserRegistrationService,
    private val courseMapper: CourseMapper,
) {

    @Transactional
    fun register(request: RegistrationRequest, registrarUsername: String): RegistrationResponse {
        val registrar = requireNotNull(userMapper.findByUsername(registrarUsername))
        val teacherId = resolveTeacherId(request, registrar)
        val user = userRegistrationService.create(request)

        if (teacherId != null) {
            check(courseMapper.insert(teacherId, requireNotNull(user.id), CURRENT_ACADEMIC_YEAR) == 1) {
                "Course was not created"
            }
        }

        return RegistrationResponse(
            id = requireNotNull(user.id) { "Generated user id is missing" },
            username = user.username,
            role = user.role,
        )
    }

    private fun resolveTeacherId(request: RegistrationRequest, registrar: UserAccount): Long? = when (registrar.role) {
        UserRole.ADMIN -> {
            if (request.role != UserRole.STUDENT && request.teacherId != null) {
                throw ValidationException("Преподавателя можно назначить только ученику")
            }
            request.teacherId?.also { teacherId ->
                if (userMapper.findById(teacherId)?.role != UserRole.TEACHER) {
                    throw ValidationException("Выбранный преподаватель не найден")
                }
            }
        }
        UserRole.TEACHER -> {
            if (request.role != UserRole.STUDENT) {
                throw ValidationException("Преподаватель может регистрировать только учеников")
            }
            val registrarId = requireNotNull(registrar.id)
            if (request.teacherId != null && request.teacherId != registrarId) {
                throw ValidationException("Преподаватель может назначить ученика только себе")
            }
            registrarId
        }
        UserRole.STUDENT -> throw ValidationException("Недостаточно прав для регистрации пользователя")
    }

    private companion object {
        const val CURRENT_ACADEMIC_YEAR = "2025/26"
    }
}
