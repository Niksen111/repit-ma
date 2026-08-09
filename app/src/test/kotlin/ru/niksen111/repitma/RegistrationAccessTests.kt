package ru.niksen111.repitma

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper
import ru.niksen111.repitma.courses.mapper.CourseMapper

@SpringBootTest(properties = ["spring.datasource.url=jdbc:sqlite:file:registration-access-tests?mode=memory&cache=shared"])
@AutoConfigureMockMvc
class RegistrationAccessTests(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val userMapper: UserMapper,
    @Autowired private val courseMapper: CourseMapper,
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
    @WithMockUser(username = "admin", roles = ["ADMIN"])
    fun `administrator chooses the new user role`() {
        mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = registrationJson("TEACHER", "new-teacher")
        }.andExpect {
            status { isCreated() }
            jsonPath("$.role") { value("TEACHER") }
        }
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `administrator sees teacher logins`() {
        testUser("teacher-directory-login", UserRole.TEACHER)

        mockMvc.get("/api/teachers").andExpect {
            status { isOk() }
            jsonPath("$[?(@.username == 'teacher-directory-login')]") { exists() }
        }
    }

    @Test
    fun `teacher registers a student on own course`() {
        val teacher = UserAccount(
            username = "teacher-course-test",
            passwordHash = "unused-in-mock-auth",
            role = UserRole.TEACHER,
        )
        userMapper.insert(teacher)

        mockMvc.post("/api/auth/register") {
            with(user(teacher.username).roles("TEACHER"))
            contentType = MediaType.APPLICATION_JSON
            content = registrationJson("STUDENT", "student-course-test")
        }.andExpect {
            status { isCreated() }
        }

        mockMvc.get("/api/courses") {
            with(user(teacher.username).roles("TEACHER"))
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].username") { value("student-course-test") }
            jsonPath("$[0].academicYear") { value("2025/26") }
        }
    }

    @Test
    fun `teacher cannot open another teacher course`() {
        val owner = testUser("course-owner", UserRole.TEACHER)
        val stranger = testUser("course-stranger", UserRole.TEACHER)
        val student = testUser("course-student", UserRole.STUDENT)
        courseMapper.insert(requireNotNull(owner.id), requireNotNull(student.id), "2025/26")
        val courseId = courseMapper.findForUser(requireNotNull(owner.id)).single().id

        mockMvc.get("/api/courses/$courseId") {
            with(user(stranger.username).roles("TEACHER"))
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    @WithMockUser(username = "admin", roles = ["ADMIN"])
    fun `personal data requires consent`() {
        mockMvc.put("/api/profile") {
            contentType = MediaType.APPLICATION_JSON
            content = profileJson(consent = false)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("validation_failed") }
        }
    }

    @Test
    @WithMockUser(username = "admin", roles = ["ADMIN"])
    fun `profile is saved after consent`() {
        mockMvc.put("/api/profile") {
            contentType = MediaType.APPLICATION_JSON
            content = profileJson(consent = true)
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Анна") }
            jsonPath("$.telegram") { value("@anna_teacher") }
            jsonPath("$.city") { value("Москва") }
            jsonPath("$.vk") { doesNotExist() }
            jsonPath("$.grade") { value(8) }
        }
    }

    @Test
    @WithMockUser(username = "admin", roles = ["ADMIN"])
    fun `telegram and vk cannot be saved together`() {
        mockMvc.put("/api/profile") {
            contentType = MediaType.APPLICATION_JSON
            content = profileJson(consent = true, vk = "anna_school")
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("validation_failed") }
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

    private fun testUser(username: String, role: UserRole): UserAccount =
        UserAccount(username = username, passwordHash = "unused-in-mock-auth", role = role).also {
            userMapper.insert(it)
        }

    private fun profileJson(consent: Boolean, vk: String? = null): String {
        val vkField = vk?.let { "\"vk\": \"$it\"," }.orEmpty()
        return """
        {
          "name": "Анна",
          "telegram": "@anna_teacher",
          $vkField
          "city": "Москва",
          "grade": 8,
          "consent": $consent
        }
        """.trimIndent()
    }
}
