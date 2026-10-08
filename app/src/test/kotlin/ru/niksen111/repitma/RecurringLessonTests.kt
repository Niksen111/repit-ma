package ru.niksen111.repitma

import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.dao.DataAccessException
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.courses.service.RecurringLessonGenerator
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@SpringBootTest(properties = [
    "spring.datasource.url=jdbc:sqlite:file:recurring-lesson-tests?mode=memory&cache=shared",
    "repitma.recurring-lessons.enabled=false",
])
@AutoConfigureMockMvc
@Import(RecurringLessonTests.TimeConfiguration::class)
class RecurringLessonTests(
    @Autowired private val mvc: MockMvc,
    @Autowired private val json: ObjectMapper,
    @Autowired private val users: UserMapper,
    @Autowired private val courses: CourseMapper,
    @Autowired private val jdbc: JdbcTemplate,
    @Autowired private val generator: RecurringLessonGenerator,
    @Autowired private val clock: TestClock,
) {
    class TestClock : Clock() {
        val current = AtomicReference(Instant.parse("2026-10-07T07:30:00Z"))
        override fun getZone(): ZoneId = ZoneId.of("Europe/Moscow")
        override fun withZone(zone: ZoneId): Clock = fixed(instant(), zone)
        override fun instant(): Instant = current.get()
    }

    @TestConfiguration
    class TimeConfiguration {
        @Bean @Primary
        fun recurringTestClock() = TestClock()
    }

    private lateinit var teacher: UserAccount
    private lateinit var student: UserAccount
    private lateinit var outsider: UserAccount
    private var courseId = 0L
    private var otherCourseId = 0L
    private val base get() = "/api/courses/$courseId"
    private val recurring get() = "$base/recurring-lessons"

    @BeforeEach
    fun setUp() {
        clock.current.set(Instant.parse("2026-10-07T07:30:00Z")) // Wednesday, 10:30 Moscow.
        teacher = account(UserRole.TEACHER)
        student = account(UserRole.STUDENT)
        outsider = account(UserRole.TEACHER)
        courses.insert(requireNotNull(teacher.id), requireNotNull(student.id), "2026/27")
        courses.insert(requireNotNull(teacher.id), requireNotNull(account(UserRole.STUDENT).id), "2026/27")
        val created = courses.findForUser(requireNotNull(teacher.id))
        courseId = created.single { it.studentId == student.id }.id
        otherCourseId = created.single { it.studentId != student.id }.id
    }

    @Test
    fun `creation fills seven days immediately and daily runs only add missing dates`() {
        val schedule = create()
        val id = schedule["id"].asLong()
        assertEquals("2026-10-07", schedule["startDate"].asString())
        assertEquals(3, schedule["slots"].size())
        assertTrue(schedule["active"].asBoolean())
        assertEquals(listOf("2026-10-07T11:00:00", "2026-10-09T17:00:00", "2026-10-12T16:00:00"), dates())
        for (lesson in read("$base/lessons", student)) {
            assertEquals("Занятие по расписанию", lesson["title"].asString())
            assertTrue(lesson["description"].asString().isNotBlank())
            assertEquals(id, lesson["recurringScheduleId"].asLong())
            assertEquals("SCHEDULED", lesson["status"].asString())
            assertFalse(lesson["paid"].asBoolean())
        }
        repeat(3) { assertEquals(0, generator.generate(id)) }
        assertEquals(3, occurrenceCount(id))
        clock.current.set(Instant.parse("2026-10-08T07:30:00Z"))
        assertEquals(1, generator.generate(id))
        assertEquals(0, generator.generate(id))
        assertEquals("2026-10-14T11:00:00", dates().last())
        assertEquals(4, occurrenceCount(id))
    }

    @Test
    fun `generation respects exact time bounds start and inclusive end dates`() {
        val exact = create("""{"slots":[{"dayOfWeek":3,"startTime":"10:30"}]}""")
        assertEquals(listOf("2026-10-07T10:30:00"), dates())
        assertEquals(0, generator.generate(exact["id"].asLong()))
        val bounded = create("""{"slots":[{"dayOfWeek":1,"startTime":"09:00"}],"startDate":"2026-10-12","endDate":"2026-10-12"}""")
        assertTrue(dates().contains("2026-10-12T09:00:00"))
        clock.current.set(Instant.parse("2026-10-13T07:30:00Z"))
        assertEquals(0, generator.generate(bounded["id"].asLong()))
        val later = create("""{"slots":[{"dayOfWeek":2,"startTime":"18:00"}],"startDate":"2026-10-27"}""")
        assertEquals(0, generator.generate(later["id"].asLong()))
        assertEquals(2, dates().size)
    }

    @Test
    fun `moved deleted and cancelled occurrences are never recreated`() {
        val id = create()["id"].asLong()
        val lessons = read("$base/lessons", teacher).toList()
        val moved = lessons[0]["id"].asLong()
        val removed = lessons[1]["id"].asLong()
        val cancelled = lessons[2]["id"].asLong()
        write("PUT", "$base/lessons/$moved", teacher, """{"title":"Перенос","scheduledAt":"2026-10-08T12:00"}""", 200)
        mvc.perform(delete("$base/lessons/$removed").with(auth(teacher))).andExpect(status().isNoContent)
        write("PUT", "$base/lessons/$cancelled/tracking", teacher, """{"outcome":"CANCELLED"}""", 200)
        repeat(2) { assertEquals(0, generator.generate(id)) }
        assertEquals(listOf("2026-10-08T12:00:00", "2026-10-12T16:00:00"), dates())
        assertEquals(3, occurrenceCount(id))
        assertEquals(1, count("SELECT COUNT(*) FROM recurring_lesson_occurrences o JOIN recurring_lesson_slots s ON s.id = o.slot_id WHERE s.schedule_id = $id AND o.lesson_id IS NULL"))
        assertEquals("CANCELLED", read("$base/lessons", student).last()["status"].asString())
    }

    @Test
    fun `stopping keeps existing lessons and resuming fills future weeks without duplicates`() {
        val id = create()["id"].asLong()
        assertFalse(write("PUT", "$recurring/$id/active", teacher, """{"active":false}""", 200)["active"].asBoolean())
        assertEquals(3, dates().size)
        assertTrue(read("$base/lessons", teacher).all { it["status"].asString() == "SCHEDULED" })
        clock.current.set(Instant.parse("2026-10-15T07:30:00Z"))
        assertEquals(0, generator.generate(id))
        assertTrue(write("PUT", "$recurring/$id/active", teacher, """{"active":true}""", 200)["active"].asBoolean())
        assertEquals(6, dates().size)
        assertEquals(0, generator.generate(id))
    }

    @Test
    fun `optional cancellation only affects future generated lessons and preserves history and manual lessons`() {
        val id = create()["id"].asLong()
        val first = read("$base/lessons", teacher).first()["id"].asLong()
        clock.current.set(Instant.parse("2026-10-11T07:30:00Z"))
        write("PUT", "$base/lessons/$first/tracking", teacher, """{"outcome":"HELD","paid":true}""", 200)
        val manual = write("POST", "$base/lessons", teacher, """{"title":"Разовое","scheduledAt":"2026-10-13T18:00"}""", 201)["id"].asLong()
        write("PUT", "$recurring/$id/active", teacher, """{"active":false,"cancelUpcoming":true}""", 200)
        val lessons = read("$base/lessons", student)
        assertEquals(4, lessons.size())
        assertEquals("HELD", lessons.first()["status"].asString())
        assertTrue(lessons.first()["paid"].asBoolean())
        assertEquals("PAST", lessons[1]["status"].asString())
        assertEquals("CANCELLED", lessons[2]["status"].asString())
        assertEquals(manual, lessons.last()["id"].asLong())
        assertEquals("SCHEDULED", lessons.last()["status"].asString())
        write("PUT", "$recurring/$id/active", teacher, """{"active":true}""", 200)
        assertEquals(1, read("$base/lessons", student).count { it["scheduledAt"].asString() == "2026-10-12T16:00:00" })
        assertEquals("CANCELLED", read("$base/lessons", student).single { it["scheduledAt"].asString() == "2026-10-12T16:00:00" }["status"].asString())
    }

    @Test
    fun `manual lessons at the same time are preserved instead of duplicated or claimed as generated`() {
        val manual = write("POST", "$base/lessons", teacher, """{"title":"Вручную","scheduledAt":"2026-10-07T11:00"}""", 201)
        val id = create()["id"].asLong()
        assertEquals(3, dates().size)
        assertEquals(3, occurrenceCount(id))
        val preserved = read("$base/lessons", student).first()
        assertEquals(manual["id"].asLong(), preserved["id"].asLong())
        assertEquals("Вручную", preserved["title"].asString())
        assertTrue(preserved["recurringScheduleId"].isNull)
        write("PUT", "$recurring/$id/active", teacher, """{"active":false,"cancelUpcoming":true}""", 200)
        assertEquals("SCHEDULED", read("$base/lessons", student).first()["status"].asString())
    }

    @Test
    fun `simultaneous generators commit one occurrence and failures roll back the claim`() {
        val id = create()["id"].asLong()
        clock.current.set(Instant.parse("2026-10-08T07:30:00Z"))
        val runs = (1..2).map { CompletableFuture.supplyAsync { generator.generate(id) } }
        assertEquals(listOf(0, 1), runs.map { it.get(30, TimeUnit.SECONDS) }.sorted())
        assertEquals(4, dates().size)
        clock.current.set(Instant.parse("2026-10-10T07:30:00Z"))
        jdbc.execute("CREATE TRIGGER reject_recurring_test BEFORE INSERT ON lessons WHEN NEW.recurring_schedule_id = $id BEGIN SELECT RAISE(ABORT, 'Test failure'); END")
        try {
            assertThrows<DataAccessException> { generator.generate(id) }
            assertEquals(4, occurrenceCount(id))
            assertEquals(4, dates().size)
        } finally { jdbc.execute("DROP TRIGGER reject_recurring_test") }
        assertEquals(1, generator.generate(id))
        assertEquals(5, occurrenceCount(id))
    }

    @Test
    fun `invalid slots date ranges duplicate slots and overlapping active schedules are rejected`() {
        for (body in listOf(
            """{"slots":[]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"}],"title":"   "}""",
            """{"slots":[{"dayOfWeek":8,"startTime":"11:00"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"25:00"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00:01"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"},{"dayOfWeek":1,"startTime":"11:00"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"}],"startDate":"broken"}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"}],"startDate":"2026-10-10","endDate":"2026-10-09"}""",
        )) write("POST", recurring, teacher, body, 400)
        assertEquals(0, read(recurring, teacher).size())
        assertEquals(0, dates().size)
        val id = create()["id"].asLong()
        write("POST", recurring, teacher, scheduleJson(), 409)
        write("PUT", "$recurring/$id/active", teacher, """{"active":true,"cancelUpcoming":true}""", 400)
        write("PUT", "$recurring/$id/active", teacher, """{"active":false}""", 200)
        create() // A stopped schedule does not reserve the weekly slot forever.
        write("PUT", "$recurring/$id/active", teacher, """{"active":true}""", 409)
        assertEquals(3, dates().size)
    }

    @Test
    fun `only the teacher of the course or an administrator may manage recurring schedules`() {
        val id = create()["id"].asLong()
        mvc.perform(get(recurring)).andExpect(status().isUnauthorized)
        mvc.perform(get(recurring).with(auth(student))).andExpect(status().isForbidden)
        mvc.perform(get(recurring).with(auth(outsider))).andExpect(status().isNotFound)
        write("POST", recurring, student, scheduleJson(), 403)
        write("POST", recurring, outsider, scheduleJson(), 404)
        write("PUT", "$recurring/$id/active", student, """{"active":false}""", 403)
        write("PUT", "/api/courses/$otherCourseId/recurring-lessons/$id/active", teacher, """{"active":false}""", 404)
        assertTrue(read(recurring, teacher).first()["active"].asBoolean())
        assertEquals(1, read(recurring, account(UserRole.ADMIN)).size())
    }

    @Test
    fun `editing saves the same schedule and preserves moved deleted and paid lessons`() {
        val id = create()["id"].asLong()
        val original = read("$base/lessons", teacher).toList()
        val moved = original[0]["id"].asLong()
        val removed = original[1]["id"].asLong()
        write("PUT", "$base/lessons/$moved", teacher, """{"title":"Индивидуальное занятие","scheduledAt":"2026-10-08T12:00"}""", 200)
        write("PUT", "$base/lessons/$moved/tracking", teacher, """{"paid":true}""", 200)
        mvc.perform(delete("$base/lessons/$removed").with(auth(teacher))).andExpect(status().isNoContent)
        val updated = write("PUT", "$recurring/$id", teacher, """{
            "slots":[{"dayOfWeek":1,"startTime":"16:00"},{"dayOfWeek":3,"startTime":"11:00"},{"dayOfWeek":5,"startTime":"17:00"}],
            "title":"Новое название","description":"Новая программа","startDate":"2026-10-01","endDate":"2026-10-31"
        }""", 200)
        assertEquals(id, updated["id"].asLong())
        val persisted = read(recurring, teacher).single()
        assertEquals(updated, persisted)
        assertEquals("Новое название", persisted["title"].asString())
        assertEquals("Новая программа", persisted["description"].asString())
        assertEquals("2026-10-01", persisted["startDate"].asString())
        assertEquals("2026-10-31", persisted["endDate"].asString())
        assertEquals(3, persisted["slots"].size())
        assertEquals(2, dates().size)
        assertEquals(3, occurrenceCount(id))
        assertEquals(3, count("SELECT COUNT(*) FROM recurring_lesson_slots WHERE schedule_id = $id"))
        val preserved = read("$base/lessons", student).first()
        assertEquals(moved, preserved["id"].asLong())
        assertEquals("Индивидуальное занятие", preserved["title"].asString())
        assertTrue(preserved["paid"].asBoolean())
        clock.current.set(Instant.parse("2026-10-08T07:30:00Z"))
        assertEquals(1, generator.generate(id))
        val next = read("$base/lessons", student).last()
        assertEquals("2026-10-14T11:00:00", next["scheduledAt"].asString())
        assertEquals("Новое название", next["title"].asString())
        assertEquals("Новая программа", next["description"].asString())
    }

    @Test
    fun `removing and restoring slots keeps their occurrence identities and only generates current slots`() {
        val id = create()["id"].asLong()
        val original = read("$base/lessons", teacher).toList()
        val cancelled = original[0]["id"].asLong()
        val removed = original[1]["id"].asLong()
        write("PUT", "$base/lessons/$cancelled/tracking", teacher, """{"outcome":"CANCELLED"}""", 200)
        mvc.perform(delete("$base/lessons/$removed").with(auth(teacher))).andExpect(status().isNoContent)
        val changed = write("PUT", "$recurring/$id", teacher, """{"slots":[{"dayOfWeek":3,"startTime":"12:00"}]}""", 200)
        assertEquals(1, changed["slots"].size())
        assertEquals("12:00", changed["slots"].first()["startTime"].asString())
        assertEquals(3, dates().size)
        assertEquals(4, occurrenceCount(id))
        repeat(2) { write("PUT", "$recurring/$id", teacher, scheduleJson(), 200) }
        assertEquals(3, dates().size)
        assertEquals(4, occurrenceCount(id))
        assertEquals(4, count("SELECT COUNT(*) FROM recurring_lesson_slots WHERE schedule_id = $id"))
        assertEquals(3, count("SELECT COUNT(*) FROM recurring_lesson_slots WHERE schedule_id = $id AND active = 1"))
        assertEquals("CANCELLED", read("$base/lessons", student).first()["status"].asString())
        assertFalse(dates().contains("2026-10-09T17:00:00"))
        clock.current.set(Instant.parse("2026-10-10T07:30:00Z"))
        assertEquals(2, generator.generate(id))
        assertTrue(dates().contains("2026-10-14T11:00:00"))
        assertTrue(dates().contains("2026-10-16T17:00:00"))
        assertFalse(dates().contains("2026-10-14T12:00:00"))
        assertEquals(0, generator.generate(id))
    }

    @Test
    fun `editing a paused expired schedule does not resume generation or reset its start date`() {
        val id = create("""{"slots":[{"dayOfWeek":3,"startTime":"11:00"}],"endDate":"2026-10-07"}""")["id"].asLong()
        write("PUT", "$recurring/$id/active", teacher, """{"active":false}""", 200)
        clock.current.set(Instant.parse("2026-10-09T07:30:00Z"))
        write("PUT", "$recurring/$id", teacher, """{"slots":[{"dayOfWeek":3,"startTime":"11:00"}],"title":"История","endDate":"2026-10-07"}""", 200)
        val updated = write("PUT", "$recurring/$id", teacher, """{"slots":[{"dayOfWeek":5,"startTime":"18:00"}],"title":"Новая программа","description":null}""", 200)
        assertFalse(updated["active"].asBoolean())
        assertEquals("2026-10-07", updated["startDate"].asString())
        assertTrue(updated["endDate"].isNull)
        assertTrue(updated["description"].isNull)
        assertEquals(0, generator.generate(id))
        assertEquals(1, dates().size)
        write("PUT", "$recurring/$id/active", teacher, """{"active":true}""", 200)
        assertEquals(listOf("2026-10-07T11:00:00", "2026-10-09T18:00:00"), dates())
        assertEquals("Новая программа", read("$base/lessons", student).last()["title"].asString())
    }

    @Test
    fun `editing validates permissions and conflicts before changing persisted schedule data`() {
        val id = create()["id"].asLong()
        val another = """{"slots":[{"dayOfWeek":2,"startTime":"10:00"}]}"""
        create(another)
        val before = read(recurring, teacher)
        write("PUT", "$recurring/$id", teacher, another, 409)
        for (body in listOf(
            """{"slots":[]}""",
            """{"slots":[{"dayOfWeek":0,"startTime":"11:00"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"25:00"}]}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"}],"title":" "}""",
            """{"slots":[{"dayOfWeek":1,"startTime":"11:00"}],"startDate":"2026-10-10","endDate":"2026-10-09"}""",
        )) write("PUT", "$recurring/$id", teacher, body, 400)
        write("PUT", "$recurring/$id", student, scheduleJson(), 403)
        write("PUT", "$recurring/$id", outsider, scheduleJson(), 404)
        write("PUT", "/api/courses/$otherCourseId/recurring-lessons/$id", teacher, scheduleJson(), 404)
        assertEquals(before, read(recurring, teacher))
        assertEquals(4, dates().size)
        assertEquals(3, occurrenceCount(id))
    }

    private fun create(body: String = scheduleJson()) = write("POST", recurring, teacher, body, 201)
    private fun scheduleJson() = """{"slots":[{"dayOfWeek":1,"startTime":"16:00"},{"dayOfWeek":3,"startTime":"11:00"},{"dayOfWeek":5,"startTime":"17:00"}]}"""
    private fun dates(): List<String> = read("$base/lessons", teacher).toList().map { it["scheduledAt"].asString() }
    private fun occurrenceCount(id: Long) = count("SELECT COUNT(*) FROM recurring_lesson_occurrences o JOIN recurring_lesson_slots s ON s.id = o.slot_id WHERE s.schedule_id = $id")
    private fun count(sql: String) = requireNotNull(jdbc.queryForObject(sql, Int::class.java))
    private fun auth(account: UserAccount) = user(account.username).roles(account.role.name)
    private fun account(role: UserRole) = UserAccount(username = UUID.randomUUID().toString(), passwordHash = "unused", role = role).also { users.insert(it) }
    private fun read(url: String, account: UserAccount): JsonNode = json.readTree(mvc.perform(get(url).with(auth(account))).andExpect(status().isOk).andReturn().response.contentAsByteArray)
    private fun write(method: String, url: String, account: UserAccount, body: String, expected: Int): JsonNode {
        val request = if (method == "POST") post(url) else put(url)
        val response = mvc.perform(request.with(auth(account)).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().`is`(expected)).andReturn().response
        return json.readTree(response.contentAsString.ifBlank { "{}" })
    }
}
