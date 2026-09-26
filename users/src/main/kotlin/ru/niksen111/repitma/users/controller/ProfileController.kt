package ru.niksen111.repitma.users.controller

import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.users.dto.ProfileResponse
import ru.niksen111.repitma.users.dto.ProfileUpdateRequest
import ru.niksen111.repitma.users.security.CurrentUsername
import ru.niksen111.repitma.users.service.ProfileService

@RestController
@RequestMapping("/api/profile")
class ProfileController(
    private val profileService: ProfileService,
) {
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    fun profile(@CurrentUsername username: String): ProfileResponse {
        return profileService.get(username)
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    fun update(
        @CurrentUsername username: String,
        @Valid @RequestBody request: ProfileUpdateRequest,
    ): ProfileResponse = profileService.update(username, request)
}
