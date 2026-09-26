package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.entity.CourseFile

@Mapper
interface FileMapper {
    fun insert(file: CourseFile): Int
    fun findById(@Param("fileId") fileId: Long): CourseFile?
    fun deleteIfUnreferenced(@Param("fileId") fileId: Long): Int
}
