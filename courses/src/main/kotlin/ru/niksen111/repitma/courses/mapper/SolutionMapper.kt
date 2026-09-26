package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.dto.FileResponse
import ru.niksen111.repitma.courses.entity.Solution

@Mapper
interface SolutionMapper {
    fun insert(solution: Solution): Int
    fun update(solution: Solution): Int
    fun grade(solution: Solution): Int
    fun delete(@Param("solutionId") solutionId: Long): Int
    fun findById(@Param("solutionId") solutionId: Long): Solution?
    fun findByTask(@Param("taskId") taskId: Long): Solution?

    fun attachFile(
        @Param("solutionId") solutionId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun detachFile(
        @Param("solutionId") solutionId: Long,
        @Param("fileId") fileId: Long,
    ): Int

    fun containsFile(
        @Param("solutionId") solutionId: Long,
        @Param("fileId") fileId: Long,
    ): Boolean

    fun findFiles(@Param("solutionId") solutionId: Long): List<FileResponse>

}
