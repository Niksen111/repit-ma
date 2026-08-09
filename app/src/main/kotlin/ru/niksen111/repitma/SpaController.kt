package ru.niksen111.repitma

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SpaController {
    @GetMapping(value = ["/login", "/register", "/account", "/privacy", "/students", "/learning", "/courses/{courseId}"])
    fun frontend(): String = "forward:/index.html"
}
