package ru.niksen111.repitma.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class RegistrationRequest(
    @field:NotBlank(message = "Введите логин")
    @field:Size(min = 3, max = 32, message = "Логин должен содержать от 3 до 32 символов")
    @field:Pattern(
        regexp = "^[A-Za-z0-9._-]+$",
        message = "Логин может содержать латинские буквы, цифры, точки, дефисы и подчеркивания",
    )
    val username: String,
    @field:Size(min = 8, max = 72, message = "Пароль должен содержать от 8 до 72 символов")
    val password: String,
)
