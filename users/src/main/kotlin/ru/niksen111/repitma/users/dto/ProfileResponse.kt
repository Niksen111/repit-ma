package ru.niksen111.repitma.users.dto

import ru.niksen111.repitma.users.entity.UserRole

data class ProfileResponse(
    val id: Long,
    val username: String,
    val role: UserRole,
    val name: String?,
    val telegram: String?,
    val city: String?,
    val vk: String?,
    val grade: Int?,
    val personalDataConsentGiven: Boolean,
)
