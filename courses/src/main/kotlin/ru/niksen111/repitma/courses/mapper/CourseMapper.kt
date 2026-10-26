package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.dto.CourseResponse

@Mapper
interface CourseMapper {
    fun insert(
        @Param("teacherId") teacherId: Long,
        @Param("studentId") studentId: Long,
        @Param("academicYear") academicYear: String,
    ): Int

    fun findAll(): List<CourseResponse>
    fun findForUser(@Param("userId") userId: Long): List<CourseResponse>
    fun findById(@Param("courseId") courseId: Long): CourseResponse?
    fun findTeacherNote(@Param("courseId") courseId: Long): String?
    fun updateTeacherNote(@Param("courseId") courseId: Long, @Param("note") note: String): Int
}
