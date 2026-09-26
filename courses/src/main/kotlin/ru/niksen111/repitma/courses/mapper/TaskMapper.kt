package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.dto.FileResponse
import ru.niksen111.repitma.courses.entity.Task

@Mapper
interface TaskMapper {
    fun insert(task: Task): Int
    fun update(task: Task): Int
    fun delete(@Param("taskId") taskId: Long): Int
    fun findById(@Param("taskId") taskId: Long): Task?
    fun findByLesson(@Param("lessonId") lessonId: Long): List<Task>

    fun attachFile(
        @Param("taskId") taskId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun detachFile(
        @Param("taskId") taskId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun containsFile(
        @Param("taskId") taskId: Long,
        @Param("fileId") fileId: Long,
    ): Boolean

    fun findFiles(@Param("taskId") taskId: Long): List<FileResponse>

}
