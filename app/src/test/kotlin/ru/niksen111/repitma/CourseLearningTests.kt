package ru.niksen111.repitma

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import ru.niksen111.repitma.courses.dto.FileOwnerType
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.courses.service.FileService
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@SpringBootTest(
    properties = ["spring.datasource.url=jdbc:sqlite:file:course-learning-tests?mode=memory&cache=shared"],
)
@AutoConfigureMockMvc
class CourseLearningTests(
    @Autowired private val mvc: MockMvc,
    @Autowired private val json: ObjectMapper,
    @Autowired private val users: UserMapper,
    @Autowired private val courses: CourseMapper,
    @Autowired private val jdbc: JdbcTemplate,
    @Autowired private val files: FileService,
) {
    private lateinit var teacher: UserAccount
    private lateinit var student: UserAccount
    private lateinit var outsider: UserAccount
    private var courseId = 0L
    private var otherCourseId = 0L
    private val base: String get() = "/api/courses/$courseId"

    @BeforeEach
    fun setUp() {
        teacher = createUser(UserRole.TEACHER)
        student = createUser(UserRole.STUDENT)
        outsider = createUser(UserRole.STUDENT)
        courses.insert(requireNotNull(teacher.id), requireNotNull(student.id), "2026/27")
        courses.insert(requireNotNull(teacher.id), requireNotNull(outsider.id), "2026/27")
        val created = courses.findForUser(requireNotNull(teacher.id))
        courseId = created.single { it.studentId == student.id }.id
        otherCourseId = created.single { it.studentId == outsider.id }.id
    }

    @Test
    fun `lesson task solution lifecycle and grading lock`() {
        val lesson = createLesson()
        val lessonId = lesson["id"].asLong()
        assertEquals("Алгебра", lesson["title"].asString())
        assertEquals("2026-09-26T15:00:00", lesson["scheduledAt"].asString())

        write("PUT", "$base/lessons/$lessonId", teacher, lessonJson(), 200)
        val taskId = createTask(lessonId)
        write("PUT", "$base/tasks/$taskId", teacher, """{"title":"Уравнения","description":"Задания"}""", 200)
        createTask(lessonId)
        val tasks = read("$base/lessons/$lessonId/tasks", student)
        assertEquals(2, tasks.size())
        assertEquals("Уравнения", tasks[0]["title"].asString())

        val solutionId = createSolution(taskId)
        write("PUT", "$base/solutions/$solutionId", student, """{"description":"Исправленное решение"}""", 200)
        write("POST", "$base/tasks/$taskId/solution", student, "{}", 409)

        val grade = write(
            "PUT",
            "$base/solutions/$solutionId/grade",
            teacher,
            """{"grade":false,"teacherComment":"Проверь второй шаг"}""",
            200,
        )
        assertFalse(grade["grade"].asBoolean())
        assertTrue(grade["gradedAt"].asString().endsWith("Z"))
        val rejected = write(
            "PUT",
            "$base/solutions/$solutionId",
            student,
            """{"description":"Подмена после проверки"}""",
            409,
        )
        assertTrue(rejected["message"].asString().contains("нельзя редактировать"))
        assertEquals(
            "Исправленное решение",
            read("$base/tasks/$taskId/solution", student)["description"].asString(),
        )
        write("PUT", "$base/solutions/$solutionId/grade", teacher, """{"grade":true}""", 200)
        write("PUT", "$base/solutions/$solutionId", student, "{}", 409)
    }

    @Test
    fun `all attachment types can be listed downloaded and explicitly removed`() {
        val lessonId = createLesson()["id"].asLong()
        val taskId = createTask(lessonId)
        val solutionId = createSolution(taskId)
        val owners = listOf(
            Triple("LESSON", lessonId, teacher),
            Triple("TASK", taskId, teacher),
            Triple("SOLUTION", solutionId, student),
        )
        for ((type, ownerId, author) in owners) {
            val file = upload(type, ownerId, author)
            val fileId = file["id"].asLong()
            assertEquals("ответ.txt", file["originalName"].asString())
            val params = "ownerType=$type&ownerId=$ownerId"
            assertEquals(fileId, read("$base/files?$params", student)[0]["id"].asLong())

            val download = mvc.perform(
                get("$base/files/$fileId?$params").with(auth(teacher)),
            ).andExpect(status().isOk).andReturn().response
            assertEquals("answer", download.contentAsString)
            assertTrue(download.getHeader("Content-Disposition").orEmpty().contains("attachment"))
            assertEquals("application/octet-stream", download.contentType)

            mvc.perform(
                delete("$base/files/$fileId?$params").with(auth(author)),
            ).andExpect(status().isNoContent)
            assertEquals(0, read("$base/files?$params", student).size())
            assertEquals(0, count("SELECT COUNT(*) FROM course_files WHERE id = $fileId"))
            assertEquals(0, count("SELECT COUNT(*) FROM ${type.lowercase()}_files WHERE file_id = $fileId"))
        }
    }

    @Test
    fun `graded solution files cannot be uploaded or deleted even on fail grade`() {
        val taskId = createTask(createLesson()["id"].asLong())
        val solutionId = createSolution(taskId)
        val fileId = upload("SOLUTION", solutionId, student)["id"].asLong()
        write("PUT", "$base/solutions/$solutionId/grade", teacher, """{"grade":false}""", 200)
        upload("SOLUTION", solutionId, student, 409)
        mvc.perform(
            delete("$base/files/$fileId?ownerType=SOLUTION&ownerId=$solutionId").with(auth(student)),
        ).andExpect(status().isConflict)
        assertEquals(1, count("SELECT COUNT(*) FROM course_files WHERE id = $fileId"))
        assertEquals(1, read("$base/files?ownerType=SOLUTION&ownerId=$solutionId", student).size())
    }

    @Test
    fun `roles and parent resource boundaries are enforced`() {
        val lessonId = createLesson()["id"].asLong()
        val taskId = createTask(lessonId)
        val solutionId = createSolution(taskId)
        val fileId = upload("LESSON", lessonId, teacher)["id"].asLong()

        mvc.perform(get("$base/lessons")).andExpect(status().isUnauthorized)
        mvc.perform(get("$base/lessons").with(auth(outsider))).andExpect(status().isNotFound)
        write("POST", "$base/lessons", student, lessonJson(), 403)
        write("POST", "$base/lessons/$lessonId/tasks", student, """{"title":"Подмена"}""", 403)
        write("POST", "$base/tasks/$taskId/solution", teacher, "{}", 403)
        write("PUT", "$base/solutions/$solutionId/grade", student, """{"grade":true}""", 403)
        upload("LESSON", lessonId, student, 403)
        upload("TASK", taskId, student, 403)
        upload("SOLUTION", solutionId, teacher, 403)

        val otherBase = "/api/courses/$otherCourseId"
        write("PUT", "$otherBase/lessons/$lessonId", teacher, lessonJson(), 404)
        write("PUT", "$otherBase/tasks/$taskId", teacher, """{"title":"Подмена"}""", 404)
        write("PUT", "$otherBase/solutions/$solutionId/grade", teacher, """{"grade":true}""", 404)
        mvc.perform(
            get("$otherBase/files/$fileId?ownerType=LESSON&ownerId=$lessonId").with(auth(teacher)),
        ).andExpect(status().isNotFound)
        mvc.perform(
            get("$base/files/$fileId?ownerType=TASK&ownerId=$taskId").with(auth(student)),
        ).andExpect(status().isNotFound)
        mvc.perform(
            get("$base/files/$fileId?ownerType=LESSON&ownerId=$lessonId").with(auth(outsider)),
        ).andExpect(status().isNotFound)
        assertEquals(lessonId, read("$base/lessons", student)[0]["id"].asLong())
    }

@Test
    fun `lesson deletion removes all descendants while database deletes remain restricted`() {
        assertEquals(1, count("PRAGMA foreign_keys"))
        val lessonId = createLesson()["id"].asLong()
        val taskIds = listOf(createTask(lessonId), createTask(lessonId))
        val solutionIds = taskIds.map(::createSolution)
        write("PUT", "$base/solutions/${solutionIds[0]}/grade", teacher, """{"grade":true}""", 200)
        val fileIds = mutableListOf(upload("LESSON", lessonId, teacher)["id"].asLong())
        for ((taskId, solutionId) in taskIds.zip(solutionIds)) {
            fileIds += upload("TASK", taskId, teacher)["id"].asLong()
            if (solutionId == solutionIds[0]) {
                // Add the fixture directly: the student cannot upload after grading.
                jdbc.update(
                    "INSERT INTO course_files (original_name, content_type, content) VALUES (?, ?, ?)",
                    "graded.txt", "text/plain", "answer".toByteArray(),
                )
                val fileId = requireNotNull(jdbc.queryForObject("SELECT last_insert_rowid()", Long::class.java))
                jdbc.update("INSERT INTO solution_files (solution_id, file_id) VALUES (?, ?)", solutionId, fileId)
                fileIds += fileId
            } else {
                fileIds += upload("SOLUTION", solutionId, student)["id"].asLong()
            }
        }
        assertThrows<org.springframework.dao.DataAccessException> {
            jdbc.update("DELETE FROM lessons WHERE id = ?", lessonId)
        }
        mvc.perform(delete("$base/lessons/$lessonId").with(auth(student))).andExpect(status().isForbidden)
        mvc.perform(delete("$base/lessons/$lessonId").with(auth(outsider))).andExpect(status().isNotFound)
        mvc.perform(delete("$base/lessons/$lessonId").with(auth(teacher))).andExpect(status().isNoContent)
        assertEquals(0, count("SELECT COUNT(*) FROM lessons WHERE id = $lessonId"))
        for (taskId in taskIds) {
            assertEquals(0, count("SELECT COUNT(*) FROM tasks WHERE id = $taskId"))
            assertEquals(0, count("SELECT COUNT(*) FROM task_files WHERE task_id = $taskId"))
        }
        for (solutionId in solutionIds) {
            assertEquals(0, count("SELECT COUNT(*) FROM solutions WHERE id = $solutionId"))
            assertEquals(0, count("SELECT COUNT(*) FROM solution_files WHERE solution_id = $solutionId"))
        }
        for (fileId in fileIds) {
            assertEquals(0, count("SELECT COUNT(*) FROM course_files WHERE id = $fileId"))
        }
        assertEquals(0, count("SELECT COUNT(*) FROM lesson_files WHERE lesson_id = $lessonId"))
    }

    @Test
    fun `task deletion removes solution and files but preserves lesson and shared file`() {
        val lessonId = createLesson()["id"].asLong()
        val otherLessonId = createLesson()["id"].asLong()
        val taskId = createTask(lessonId)
        val solutionId = createSolution(taskId)
        val taskFileId = upload("TASK", taskId, teacher)["id"].asLong()
        val solutionFileId = upload("SOLUTION", solutionId, student)["id"].asLong()
        jdbc.update(
            "INSERT INTO lesson_files (lesson_id, file_id) VALUES (?, ?)",
            otherLessonId, taskFileId,
        )
        mvc.perform(delete("$base/tasks/$taskId").with(auth(teacher))).andExpect(status().isNoContent)
        assertEquals(1, count("SELECT COUNT(*) FROM lessons WHERE id = $lessonId"))
        assertEquals(0, count("SELECT COUNT(*) FROM tasks WHERE id = $taskId"))
        assertEquals(0, count("SELECT COUNT(*) FROM solutions WHERE id = $solutionId"))
        assertEquals(0, count("SELECT COUNT(*) FROM task_files WHERE task_id = $taskId"))
        assertEquals(0, count("SELECT COUNT(*) FROM solution_files WHERE solution_id = $solutionId"))
        assertEquals(0, count("SELECT COUNT(*) FROM course_files WHERE id = $solutionFileId"))
        assertEquals(1, count("SELECT COUNT(*) FROM course_files WHERE id = $taskFileId"))
        assertEquals(taskFileId, read("$base/files?ownerType=LESSON&ownerId=$otherLessonId", teacher)[0]["id"].asLong())
    }

    @Test
    fun `failed lesson deletion restores descendants and attachments`() {
        val lessonId = createLesson()["id"].asLong()
        val taskId = createTask(lessonId)
        val solutionId = createSolution(taskId)
        val fileId = upload("SOLUTION", solutionId, student)["id"].asLong()
        jdbc.execute(
            """
            CREATE TRIGGER reject_test_lesson_delete
            BEFORE DELETE ON lessons
            BEGIN
                SELECT RAISE(ABORT, 'Test lesson delete failure');
            END
            """.trimIndent(),
        )
        try {
            assertThrows<jakarta.servlet.ServletException> {
                mvc.perform(delete("$base/lessons/$lessonId").with(auth(teacher)))
            }
            assertEquals(1, count("SELECT COUNT(*) FROM lessons WHERE id = $lessonId"))
            assertEquals(1, count("SELECT COUNT(*) FROM tasks WHERE id = $taskId"))
            assertEquals(1, count("SELECT COUNT(*) FROM solutions WHERE id = $solutionId"))
            assertEquals(1, count("SELECT COUNT(*) FROM course_files WHERE id = $fileId"))
            assertEquals(1, count("SELECT COUNT(*) FROM solution_files WHERE file_id = $fileId"))
        } finally {
            jdbc.execute("DROP TRIGGER reject_test_lesson_delete")
        }
    }

    @Test
    fun `upload rolls back blob when attaching fails`() {
        val lessonId = createLesson()["id"].asLong()
        val before = count("SELECT COUNT(*) FROM course_files")
        jdbc.execute(
            """
            CREATE TRIGGER reject_test_attachment
            BEFORE INSERT ON lesson_files
            BEGIN
                SELECT RAISE(ABORT, 'Test attachment failure');
            END
            """.trimIndent(),
        )
        try {
            assertThrows<org.springframework.dao.DataAccessException> {
                files.upload(teacher.username, courseId, FileOwnerType.LESSON, lessonId, uploadFile())
            }
            assertEquals(before, count("SELECT COUNT(*) FROM course_files"))
            assertEquals(0, read("$base/files?ownerType=LESSON&ownerId=$lessonId", student).size())
        } finally {
            jdbc.execute("DROP TRIGGER reject_test_attachment")
        }
    }

    @Test
    fun `file deletion rolls back link when blob deletion fails`() {
        val lessonId = createLesson()["id"].asLong()
        val fileId = upload("LESSON", lessonId, teacher)["id"].asLong()
        jdbc.execute(
            """
            CREATE TRIGGER reject_test_file_delete
            BEFORE DELETE ON course_files
            BEGIN
                SELECT RAISE(ABORT, 'Test delete failure');
            END
            """.trimIndent(),
        )
        try {
            assertThrows<org.springframework.dao.DataAccessException> {
                files.delete(teacher.username, courseId, FileOwnerType.LESSON, lessonId, fileId)
            }
            assertEquals(1, count("SELECT COUNT(*) FROM course_files WHERE id = $fileId"))
            assertEquals(1, read("$base/files?ownerType=LESSON&ownerId=$lessonId", student).size())
        } finally {
            jdbc.execute("DROP TRIGGER reject_test_file_delete")
        }
    }

    @Test
    fun `concurrent solution submissions create exactly one solution`() {
        val taskId = createTask(createLesson()["id"].asLong())
        val attempts = (1..2).map {
            CompletableFuture.supplyAsync {
                mvc.perform(
                    post("$base/tasks/$taskId/solution")
                        .with(auth(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"),
                ).andReturn().response.status
            }
        }
        assertEquals(listOf(201, 409), attempts.map { it.join() }.sorted())
        assertEquals(1, count("SELECT COUNT(*) FROM solutions WHERE task_id = $taskId"))
    }

    @Test
    fun `grading and file upload cannot bypass the grading lock`() {
        val solutionId = createSolution(createTask(createLesson()["id"].asLong()))
        val start = CountDownLatch(1)
        val uploadAttempt = CompletableFuture.supplyAsync {
            check(start.await(10, TimeUnit.SECONDS))
            mvc.perform(
                multipart("$base/files")
                    .file(uploadFile())
                    .param("ownerType", "SOLUTION")
                    .param("ownerId", solutionId.toString())
                    .with(auth(student)),
            ).andReturn().response.status
        }
        val grading = CompletableFuture.supplyAsync {
            check(start.await(10, TimeUnit.SECONDS))
            write("PUT", "$base/solutions/$solutionId/grade", teacher, """{"grade":true}""", 200)
        }
        start.countDown()
        val uploadStatus = uploadAttempt.get(10, TimeUnit.SECONDS)
        assertTrue(uploadStatus == 201 || uploadStatus == 409)
        assertTrue(grading.get(10, TimeUnit.SECONDS)["grade"].asBoolean())
        val expectedFiles = if (uploadStatus == 201) 1 else 0
        assertEquals(
            expectedFiles,
            read("$base/files?ownerType=SOLUTION&ownerId=$solutionId", teacher).size(),
        )
        upload("SOLUTION", solutionId, student, 409)
    }

    @Test
    fun `invalid requests are rejected without accidental grades`() {
        write("POST", "$base/lessons", teacher, """{"title":" ","scheduledAt":"2026-09-26T15:00"}""", 400)
        write("POST", "$base/lessons", teacher, """{"title":"Алгебра","scheduledAt":"not-a-date"}""", 400)
        val lessonId = createLesson()["id"].asLong()
        val solutionId = createSolution(createTask(lessonId))
        write("PUT", "$base/solutions/$solutionId/grade", teacher, "{}", 400)
        assertEquals(1, count("SELECT COUNT(*) FROM solutions WHERE id = $solutionId AND grade IS NULL"))
        mvc.perform(
            multipart("$base/files")
                .file(MockMultipartFile("file", "empty.txt", "text/plain", byteArrayOf()))
                .param("ownerType", "LESSON")
                .param("ownerId", lessonId.toString())
                .with(auth(teacher)),
        ).andExpect(status().isBadRequest)
    }

    private fun createLesson(): JsonNode =
        write("POST", "$base/lessons", teacher, lessonJson(), 201)

    private fun createTask(lessonId: Long): Long =
        write("POST", "$base/lessons/$lessonId/tasks", teacher, """{"title":"Уравнения"}""", 201)["id"].asLong()

    private fun createSolution(taskId: Long): Long =
        write("POST", "$base/tasks/$taskId/solution", student, """{"description":"Решение"}""", 201)["id"].asLong()

    private fun lessonJson() =
        """{"title":"Алгебра","description":"Теория","scheduledAt":"2026-09-26T15:00"}"""

    private fun uploadFile() =
        MockMultipartFile("file", "ответ.txt", "text/plain", "answer".toByteArray())

    private fun upload(type: String, ownerId: Long, author: UserAccount, expected: Int = 201): JsonNode {
        val response = mvc.perform(
            multipart("$base/files")
                .file(uploadFile())
                .param("ownerType", type)
                .param("ownerId", ownerId.toString())
                .with(auth(author)),
        ).andExpect(status().`is`(expected)).andReturn().response
        return json.readTree(response.contentAsByteArray)
    }

    private fun read(url: String, author: UserAccount): JsonNode {
        val response = mvc.perform(get(url).with(auth(author)))
            .andExpect(status().isOk)
            .andReturn().response
        return json.readTree(response.contentAsByteArray)
    }

    private fun write(method: String, url: String, author: UserAccount, body: String, expected: Int): JsonNode {
        val builder = if (method == "POST") post(url) else put(url)
        val response = mvc.perform(
            builder.with(auth(author)).contentType(MediaType.APPLICATION_JSON).content(body),
        ).andExpect(status().`is`(expected)).andReturn().response
        return json.readTree(response.contentAsByteArray)
    }

    private fun auth(account: UserAccount) = user(account.username).roles(account.role.name)

    private fun createUser(role: UserRole): UserAccount =
        UserAccount(username = UUID.randomUUID().toString(), passwordHash = "unused", role = role).also {
            users.insert(it)
        }

    private fun count(sql: String): Int = requireNotNull(jdbc.queryForObject(sql, Int::class.java))
}
