package ru.niksen111.repitma.auth.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.auth.dto.RegistrationRequest
import ru.niksen111.repitma.auth.dto.RegistrationResponse
import ru.niksen111.repitma.auth.service.RegistrationService

@RestController
@RequestMapping("/api/auth")
class RegistrationController(
    private val registrationService: RegistrationService,
) {

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegistrationRequest): RegistrationResponse =
        registrationService.register(request)
}
