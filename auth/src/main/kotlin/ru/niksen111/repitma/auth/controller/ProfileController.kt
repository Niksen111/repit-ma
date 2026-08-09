package ru.niksen111.repitma.auth.controller

import org.springframework.security.core.Authentication
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.niksen111.repitma.auth.dto.ProfileResponse
import ru.niksen111.repitma.auth.mapper.UserMapper

@RestController
@RequestMapping("/api/profile")
class ProfileController(
    private val userMapper: UserMapper,
) {
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    fun profile(authentication: Authentication): ProfileResponse {
        val account = requireNotNull(userMapper.findByUsername(authentication.name))
        return ProfileResponse(requireNotNull(account.id), account.username, account.role)
    }
}
