package ru.niksen111.repitma.users.dto

import ru.niksen111.repitma.users.entity.UserRole

data class RegistrationResponse(
    val id: Long,
    val username: String,
    val role: UserRole,
)
