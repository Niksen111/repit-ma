package ru.niksen111.repitma

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest(properties = ["spring.datasource.url=jdbc:sqlite:file:public-frontend-tests?mode=memory&cache=shared"])
@AutoConfigureMockMvc
class PublicFrontendAccessTests(@Autowired private val mockMvc: MockMvc) {
    @Test
    fun `favicon is served to anonymous visitors`() {
        mockMvc.get("/favicon.png").andExpect {
            status { isOk() }
            content { contentType("image/png") }
            header { doesNotExist("WWW-Authenticate") }
        }
    }

    @Test
    fun `review page loads the frontend without server authentication`() {
        mockMvc.get("/reviews/new").andExpect {
            status { isOk() }
            forwardedUrl("/index.html")
        }
    }

    @Test
    fun `profile api still requires authentication`() {
        mockMvc.get("/api/profile").andExpect {
            status { isUnauthorized() }
        }
    }
}
