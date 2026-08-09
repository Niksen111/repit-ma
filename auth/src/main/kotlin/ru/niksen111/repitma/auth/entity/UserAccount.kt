package ru.niksen111.repitma.auth.entity

data class UserAccount(
    var id: Long? = null,
    val username: String,
    val passwordHash: String,
    val role: UserRole,
    val name: String? = null,
    val telegram: String? = null,
    val city: String? = null,
    val vk: String? = null,
    val grade: Int? = null,
    val profileConsentAt: String? = null,
)
