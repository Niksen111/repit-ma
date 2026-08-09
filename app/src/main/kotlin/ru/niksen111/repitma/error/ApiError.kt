package ru.niksen111.repitma.error

data class ApiError(
    val code: String,
    val message: String,
    val fields: Map<String, String> = emptyMap(),
)
