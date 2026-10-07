package ru.niksen111.repitma

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.Locale

data class PublicSite(val teacher: String)

@RestController
class PublicSiteController {
    @GetMapping("/api/public/site")
    fun site(request: HttpServletRequest): ResponseEntity<PublicSite> {
        // Caddy preserves the incoming Host. Do not accept a teacher ID from query parameters.
        val teacher = when (request.serverName.lowercase(Locale.ROOT).trimEnd('.')) {
            "repit-ma.ru", "www.repit-ma.ru", "localhost", "127.0.0.1", "::1" -> "maria"
            "okoroleva.repit-ma.ru", "okoroleva.localhost" -> "olga"
            else -> throw ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown teacher site")
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(PublicSite(teacher))
    }
}
