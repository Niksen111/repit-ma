package ru.niksen111.repitma.users.controller

import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.users.dto.ProfileResponse
import ru.niksen111.repitma.users.dto.ProfileUpdateRequest
import ru.niksen111.repitma.users.service.ProfileService

@RestController
@RequestMapping("/api/profile")
class ProfileController(
    private val profileService: ProfileService,
) {
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    fun profile(authentication: Authentication): ProfileResponse {
        return profileService.get(authentication.name)
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    fun update(
        authentication: Authentication,
        @Valid @RequestBody request: ProfileUpdateRequest,
    ): ProfileResponse = profileService.update(authentication.name, request)
}
