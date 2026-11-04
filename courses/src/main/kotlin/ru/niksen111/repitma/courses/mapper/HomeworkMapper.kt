package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.dto.HomeworkResponse

@Mapper
interface HomeworkMapper {
    fun findAwaitingSubmission(@Param("studentId") studentId: Long): List<HomeworkResponse>
    fun findAwaitingReview(@Param("teacherId") teacherId: Long?): List<HomeworkResponse>
}
