package ru.niksen111.repitma

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

@SpringBootTest(properties = ["spring.datasource.url=jdbc:sqlite:file:registration-access-tests?mode=memory&cache=shared"])
@AutoConfigureMockMvc
class RegistrationAccessTests(
    @Autowired private val mockMvc: MockMvc,
) {
    @Test
    fun `invalid password does not trigger browser login dialog`() {
        mockMvc.get("/api/profile") {
            with(httpBasic("admin", "wrong-password"))
        }.andExpect {
            status { isUnauthorized() }
            header { doesNotExist("WWW-Authenticate") }
        }
    }

    @Test
    fun `anonymous user cannot register users`() {
        mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = registrationJson("STUDENT")
        }.andExpect {
            status { isUnauthorized() }
            header { doesNotExist("WWW-Authenticate") }
        }
    }

    @Test
    @WithMockUser(roles = ["STUDENT"])
    fun `student cannot register users`() {
        mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = registrationJson("TEACHER")
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `administrator chooses the new user role`() {
        mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = registrationJson("TEACHER", "new-teacher")
        }.andExpect {
            status { isCreated() }
            jsonPath("$.role") { value("TEACHER") }
        }
    }

    private fun registrationJson(role: String, username: String = "new-user") =
        """
        {
          "username": "$username",
          "password": "password123",
          "role": "$role"
        }
        """.trimIndent()
}
