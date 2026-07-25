package ru.niksen111.repitma.auth.dto

data class ApiError(
    val code: String,
    val message: String,
    val fields: Map<String, String> = emptyMap(),
)
