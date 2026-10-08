package ru.niksen111.repitma.courses.service

import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import ru.niksen111.repitma.courses.mapper.RecurringLessonMapper

private val logger = KotlinLogging.logger {}

@Component
@ConditionalOnProperty(name = ["repitma.recurring-lessons.enabled"], havingValue = "true", matchIfMissing = true)
class RecurringLessonJob(
    private val schedules: RecurringLessonMapper,
    private val generator: RecurringLessonGenerator,
) {
    @EventListener(ApplicationReadyEvent::class)
    fun onStartup() = generate()

    @Scheduled(cron = "\${repitma.recurring-lessons.cron:0 0 3 * * *}", zone = "Europe/Moscow")
    fun generate() {
        for (id in schedules.findActiveIds()) {
            try {
                val count = generator.generate(id)
                if (count > 0) logger.info { "Generated $count lessons for recurring schedule $id" }
            } catch (error: Exception) {
                // Each schedule has its own transaction; a failure must not block the rest.
                logger.error(error) { "Failed to generate lessons for recurring schedule $id" }
            }
        }
    }
}
