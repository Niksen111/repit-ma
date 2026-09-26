package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.dto.FileResponse
import ru.niksen111.repitma.courses.entity.Lesson

@Mapper
interface LessonMapper {
    fun insert(lesson: Lesson): Int
    fun update(lesson: Lesson): Int
    fun delete(@Param("lessonId") lessonId: Long): Int
    fun findById(@Param("lessonId") lessonId: Long): Lesson?
    fun findByCourse(@Param("courseId") courseId: Long): List<Lesson>

    fun attachFile(
        @Param("lessonId") lessonId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun detachFile(
        @Param("lessonId") lessonId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun containsFile(
        @Param("lessonId") lessonId: Long,
        @Param("fileId") fileId: Long,
    ): Boolean

    fun findFiles(@Param("lessonId") lessonId: Long): List<FileResponse>

}
