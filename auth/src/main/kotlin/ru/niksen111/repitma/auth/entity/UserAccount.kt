package ru.niksen111.repitma.auth.entity

data class UserAccount(
    var id: Long? = null,
    val username: String,
    val passwordHash: String,
)
