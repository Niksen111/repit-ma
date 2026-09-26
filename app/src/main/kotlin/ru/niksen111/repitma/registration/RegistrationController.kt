package ru.niksen111.repitma.registration

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.users.dto.RegistrationRequest
import ru.niksen111.repitma.users.dto.RegistrationResponse
import ru.niksen111.repitma.users.security.CurrentUsername

@RestController
@RequestMapping("/api/auth")
class RegistrationController(
    private val registrationFacade: RegistrationFacade,
) {

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(
        @CurrentUsername username: String,
        @Valid @RequestBody request: RegistrationRequest,
    ): RegistrationResponse = registrationFacade.register(request, username)
}
