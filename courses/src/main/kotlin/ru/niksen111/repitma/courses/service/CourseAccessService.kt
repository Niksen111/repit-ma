package ru.niksen111.repitma.courses.service

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.courses.dto.CourseResponse
import ru.niksen111.repitma.courses.entity.Lesson
import ru.niksen111.repitma.courses.entity.Solution
import ru.niksen111.repitma.courses.entity.Task
import ru.niksen111.repitma.courses.mapper.CourseMapper
import ru.niksen111.repitma.courses.mapper.LessonMapper
import ru.niksen111.repitma.courses.mapper.SolutionMapper
import ru.niksen111.repitma.courses.mapper.TaskMapper
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class CourseAccessService(
    private val userMapper: UserMapper,
    private val courseMapper: CourseMapper,
    private val lessonMapper: LessonMapper,
    private val taskMapper: TaskMapper,
    private val solutionMapper: SolutionMapper,
) {
    fun requireReader(username: String, courseId: Long): CourseResponse {
        val account = account(username)
        return accessibleCourse(account, courseId)
    }

    fun requireTeacher(username: String, courseId: Long) {
        val account = account(username)
        val course = accessibleCourse(account, courseId)
        if (account.role != UserRole.ADMIN && course.teacherId != account.id) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        }
    }

    fun requireStudent(username: String, courseId: Long) {
        val account = account(username)
        val course = accessibleCourse(account, courseId)
        if (account.role != UserRole.STUDENT || course.studentId != account.id) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        }
    }

    fun lesson(courseId: Long, lessonId: Long): Lesson {
        val lesson = lessonMapper.findById(lessonId) ?: notFound()
        if (lesson.courseId != courseId) {
            notFound()
        }
        return lesson
    }

    fun task(courseId: Long, taskId: Long): Task {
        val task = taskMapper.findById(taskId) ?: notFound()
        lesson(courseId, task.lessonId)
        return task
    }

    fun solution(courseId: Long, solutionId: Long): Solution {
        val solution = solutionMapper.findById(solutionId) ?: notFound()
        task(courseId, solution.taskId)
        return solution
    }

    private fun account(username: String): UserAccount =
        userMapper.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)

    private fun accessibleCourse(account: UserAccount, courseId: Long): CourseResponse {
        val course = courseMapper.findById(courseId) ?: notFound()
        if (account.role != UserRole.ADMIN && account.id != course.teacherId && account.id != course.studentId) {
            notFound()
        }
        return course
    }

    private fun notFound(): Nothing =
        throw ResponseStatusException(HttpStatus.NOT_FOUND)
}
