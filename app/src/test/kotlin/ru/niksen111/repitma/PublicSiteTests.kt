package ru.niksen111.repitma

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest(properties = ["spring.datasource.url=jdbc:sqlite:file:public-site-tests?mode=memory&cache=shared"])
@AutoConfigureMockMvc
class PublicSiteTests(@Autowired private val mockMvc: MockMvc) {
    @Test
    fun `public teacher site is selected by host`() {
        val sites = mapOf(
            "https://repit-ma.ru" to "maria",
            "https://www.repit-ma.ru" to "maria",
            "https://okoroleva.repit-ma.ru" to "olga",
            "http://localhost:8080" to "maria",
            "http://okoroleva.localhost:5173" to "olga",
            "https://OKOROLEVA.REPIT-MA.RU" to "olga",
            "https://okoroleva.repit-ma.ru." to "olga",
        )
        sites.forEach { (origin, teacher) ->
            mockMvc.get("$origin/api/public/site").andExpect {
                status { isOk() }
                jsonPath("$.teacher") { value(teacher) }
                header { string("Cache-Control", "no-store") }
            }
        }
    }

    @Test
    fun `query and forwarded header cannot select another teacher`() {
        mockMvc.get("https://repit-ma.ru/api/public/site") {
            param("teacher", "olga")
            header("X-Forwarded-Host", "okoroleva.repit-ma.ru")
        }.andExpect {
            status { isOk() }
            jsonPath("$.teacher") { value("maria") }
        }
    }

    @Test
    fun `unknown domain does not silently show another teacher`() {
        mockMvc.get("https://unknown.repit-ma.ru/api/public/site").andExpect {
            status { isNotFound() }
        }
    }
}
