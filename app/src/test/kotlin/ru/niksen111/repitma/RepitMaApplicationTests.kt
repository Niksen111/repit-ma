package ru.niksen111.repitma

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest(properties = ["spring.datasource.url=jdbc:sqlite:file:context-load-tests?mode=memory&cache=shared"])
class RepitMaApplicationTests {

    @Test
    fun contextLoads() {
    }
}
