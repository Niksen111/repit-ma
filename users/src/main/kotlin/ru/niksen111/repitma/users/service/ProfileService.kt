package ru.niksen111.repitma.users.service

import org.springframework.stereotype.Service
import ru.niksen111.repitma.users.dto.ProfileResponse
import ru.niksen111.repitma.users.dto.ProfileUpdateRequest
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.exception.ValidationException
import ru.niksen111.repitma.users.mapper.UserMapper
import java.time.Instant

@Service
class ProfileService(
    private val userMapper: UserMapper,
) {
    fun get(username: String): ProfileResponse = userMapper.findByUsername(username).toResponse()

    fun update(username: String, request: ProfileUpdateRequest): ProfileResponse {
        val account = requireNotNull(userMapper.findByUsername(username))
        val name = request.name.clean()
        val telegram = request.telegram.clean()
        val city = request.city.clean()
        val vk = request.vk.clean()
        if (telegram != null && vk != null) {
            throw ValidationException("Можно указать только один контакт: Telegram или ВКонтакте")
        }
        val hasPersonalData = listOf(name, telegram, city, vk).any { it != null } || request.grade != null

        if (hasPersonalData && !request.consent) {
            throw ValidationException("Подтвердите согласие на обработку персональных данных")
        }

        check(
            userMapper.updateProfile(
                id = requireNotNull(account.id),
                name = name,
                telegram = telegram,
                city = city,
                vk = vk,
                grade = request.grade,
                profileConsentAt = if (request.consent) Instant.now().toString() else null,
            ) == 1,
        ) { "Profile was not updated" }

        return requireNotNull(userMapper.findByUsername(username)).toResponse()
    }

    private fun UserAccount?.toResponse(): ProfileResponse {
        val account = requireNotNull(this)
        return ProfileResponse(
            id = requireNotNull(account.id),
            username = account.username,
            role = account.role,
            name = account.name,
            telegram = account.telegram,
            city = account.city,
            vk = account.vk,
            grade = account.grade,
            personalDataConsentGiven = account.profileConsentAt != null,
        )
    }

    private fun String?.clean(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
}
