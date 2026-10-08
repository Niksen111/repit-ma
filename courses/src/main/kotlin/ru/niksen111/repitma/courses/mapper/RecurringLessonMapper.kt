package ru.niksen111.repitma.courses.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.courses.entity.RecurringLessonSchedule
import ru.niksen111.repitma.courses.entity.RecurringLessonSlot

@Mapper
interface RecurringLessonMapper {
    fun insert(schedule: RecurringLessonSchedule): Int
    fun update(schedule: RecurringLessonSchedule): Int
    fun insertSlot(slot: RecurringLessonSlot): Int
    fun findById(@Param("scheduleId") scheduleId: Long): RecurringLessonSchedule?
    fun findByCourse(@Param("courseId") courseId: Long): List<RecurringLessonSchedule>
    fun findActiveIds(): List<Long>
    fun findSlots(@Param("scheduleId") scheduleId: Long): List<RecurringLessonSlot>
    fun findAllSlots(@Param("scheduleId") scheduleId: Long): List<RecurringLessonSlot>
    fun deactivateSlots(@Param("scheduleId") scheduleId: Long): Int
    fun activateSlot(@Param("slotId") slotId: Long): Int
    fun setActive(@Param("scheduleId") scheduleId: Long, @Param("active") active: Boolean): Int
    fun reserveOccurrence(@Param("slotId") slotId: Long, @Param("scheduledAt") scheduledAt: String): Int
    fun linkOccurrence(@Param("slotId") slotId: Long, @Param("scheduledAt") scheduledAt: String, @Param("lessonId") lessonId: Long): Int
    fun cancelUpcoming(@Param("scheduleId") scheduleId: Long, @Param("now") now: String): Int
}
