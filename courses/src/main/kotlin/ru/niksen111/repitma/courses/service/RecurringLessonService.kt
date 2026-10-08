package ru.niksen111.repitma.courses.service

import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.RecurringLessonActiveRequest
import ru.niksen111.repitma.courses.dto.RecurringLessonRequest
import ru.niksen111.repitma.courses.dto.RecurringLessonResponse
import ru.niksen111.repitma.courses.dto.RecurringLessonSlotRequest
import ru.niksen111.repitma.courses.entity.RecurringLessonSchedule
import ru.niksen111.repitma.courses.entity.RecurringLessonSlot
import ru.niksen111.repitma.courses.mapper.RecurringLessonMapper

@Service
class RecurringLessonService(
    private val access: CourseAccessService,
    private val schedules: RecurringLessonMapper,
    private val generator: RecurringLessonGenerator,
    private val clock: Clock,
) {
    fun list(username: String, courseId: Long): List<RecurringLessonResponse> {
        access.requireTeacher(username, courseId)
        return schedules.findByCourse(courseId).map(::response)
    }

    @Transactional
    fun create(username: String, courseId: Long, request: RecurringLessonRequest): RecurringLessonResponse {
        access.requireTeacher(username, courseId)
        val schedule = scheduleFromRequest(courseId, request)
        val slots = normalizedSlots(request)
        requireNoOverlap(schedule, slots)
        schedules.insert(schedule)
        val id = requireNotNull(schedule.id)
        slots.forEach {
            schedules.insertSlot(
                RecurringLessonSlot(
                    scheduleId = id,
                    dayOfWeek = it.dayOfWeek,
                    startTime = it.startTime
                )
            )
        }
        generator.generate(id)
        return response(schedule)
    }

    @Transactional
    fun update(
        username: String,
        courseId: Long,
        scheduleId: Long,
        request: RecurringLessonRequest
    ): RecurringLessonResponse {
        access.requireTeacher(username, courseId)
        val current = schedules.findById(scheduleId)
            ?.takeIf { it.courseId == courseId } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
        val updated = scheduleFromRequest(courseId, request, current)
        val slots = normalizedSlots(request)
        if (updated.active) requireNoOverlap(updated, slots)
        val existing = schedules.findAllSlots(scheduleId)
            .associateBy { RecurringLessonSlotRequest(it.dayOfWeek, it.startTime) }
        schedules.update(updated)
        // Slots are immutable occurrence identities. Reuse them even after removal and re-addition.
        schedules.deactivateSlots(scheduleId)
        for (slot in slots) {
            val previous = existing[slot]
            if (previous != null) schedules.activateSlot(requireNotNull(previous.id))
            else schedules.insertSlot(RecurringLessonSlot(scheduleId = scheduleId, dayOfWeek = slot.dayOfWeek, startTime = slot.startTime))
        }
        generator.generate(scheduleId)
        return response(updated)
    }

    @Transactional
    fun setActive(
        username: String,
        courseId: Long,
        scheduleId: Long,
        request: RecurringLessonActiveRequest
    ): RecurringLessonResponse {
        access.requireTeacher(username, courseId)
        val current = schedules.findById(scheduleId)
            ?.takeIf { it.courseId == courseId } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
        if (request.active && request.cancelUpcoming)
            badRequest("Отменять будущие занятия можно только при остановке расписания")
        if (request.active) {
            if (current.endDate != null && date(current.endDate) < LocalDate.now(clock)) {
                badRequest("Срок этого расписания закончился. Измените дату окончания или создайте новое расписание")
            }
            requireNoOverlap(
                current,
                schedules.findSlots(scheduleId).map { RecurringLessonSlotRequest(it.dayOfWeek, it.startTime) })
        }
        schedules.setActive(scheduleId, request.active)
        if (request.active) generator.generate(scheduleId)
        else if (request.cancelUpcoming) {
            schedules.cancelUpcoming(
                scheduleId,
                LocalDateTime.now(clock).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            )
        }
        return response(current.copy(active = request.active))
    }

    private fun scheduleFromRequest(
        courseId: Long,
        request: RecurringLessonRequest,
        current: RecurringLessonSchedule? = null
    ): RecurringLessonSchedule {
        val start = request.startDate?.let(::date) ?: current?.startDate?.let(::date) ?: LocalDate.now(clock)
        val end = request.endDate?.let(::date)
        if (end != null && end < start) badRequest("Дата окончания должна быть не раньше даты начала")
        if (current == null && end != null && end < LocalDate.now(clock)) {
            badRequest("Дата окончания должна быть не раньше сегодняшнего дня")
        }
        return RecurringLessonSchedule(
            id = current?.id, courseId = courseId,
            title = request.title.trim(), description = request.description?.trim()?.ifBlank { null },
            startDate = start.toString(), endDate = end?.toString(), active = current?.active ?: true,
        )
    }

    private fun normalizedSlots(request: RecurringLessonRequest): List<RecurringLessonSlotRequest> {
        val slots = request.slots.map { slot ->
            val time = try {
                LocalTime.parse(slot.startTime)
            } catch (_: DateTimeParseException) {
                badRequest("Укажите корректное время занятия в формате ЧЧ:ММ")
            }
            RecurringLessonSlotRequest(slot.dayOfWeek, time.format(DateTimeFormatter.ofPattern("HH:mm")))
        }
        if (slots.distinct().size != slots.size) badRequest("Дни и время занятий не должны повторяться")
        return slots
    }

    private fun requireNoOverlap(schedule: RecurringLessonSchedule, slots: List<RecurringLessonSlotRequest>) {
        for (other in schedules.findByCourse(schedule.courseId)) {
            if (!other.active || other.id == schedule.id) continue
            if (date(schedule.startDate) > (other.endDate?.let(::date) ?: LocalDate.MAX) ||
                date(other.startDate) > (schedule.endDate?.let(::date) ?: LocalDate.MAX)
            ) continue
            if (schedules.findSlots(requireNotNull(other.id)).any { existing ->
                    slots.any { it.dayOfWeek == existing.dayOfWeek && it.startTime == existing.startTime }
                }) {
                throw ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "На этот день и время уже действует расписание. Остановите его или выберите другое время"
                )
            }
        }
    }

    private fun response(schedule: RecurringLessonSchedule) = RecurringLessonResponse(
        id = requireNotNull(schedule.id), courseId = schedule.courseId,
        title = schedule.title, description = schedule.description,
        startDate = schedule.startDate, endDate = schedule.endDate, active = schedule.active,
        slots = schedules.findSlots(requireNotNull(schedule.id))
            .map { RecurringLessonSlotRequest(it.dayOfWeek, it.startTime) },
    )

    private fun date(value: String): LocalDate = try {
        LocalDate.parse(value)
    } catch (_: DateTimeParseException) {
        badRequest("Укажите корректную дату в формате ГГГГ-ММ-ДД")
    }

    private fun badRequest(message: String): Nothing = throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)
}
