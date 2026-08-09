package ru.niksen111.repitma.users.dto

import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class ProfileUpdateRequest(
    @field:Size(max = 100, message = "Имя должно содержать не более 100 символов")
    val name: String? = null,
    @field:Pattern(
        regexp = "^$|^@?[A-Za-z0-9_]{5,32}$",
        message = "Укажите корректный ник Telegram",
    )
    val telegram: String? = null,
    @field:Size(max = 100, message = "Название города должно содержать не более 100 символов")
    val city: String? = null,
    @field:Pattern(
        regexp = "^$|^[A-Za-z0-9_.]{1,64}$",
        message = "Укажите корректный ник ВКонтакте",
    )
    val vk: String? = null,
    @field:Min(value = 1, message = "Класс должен быть от 1 до 11")
    @field:Max(value = 11, message = "Класс должен быть от 1 до 11")
    val grade: Int? = null,
    val consent: Boolean = false,
)
