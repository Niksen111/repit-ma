package ru.niksen111.repitma.courses.config

import java.time.Clock
import java.time.ZoneId
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class LessonTimeConfiguration {
    @Bean
    fun lessonClock(): Clock = Clock.system(ZoneId.of("Europe/Moscow"))
}
