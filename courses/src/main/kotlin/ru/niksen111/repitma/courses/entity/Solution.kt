package ru.niksen111.repitma.courses.entity

data class Solution(
    var id: Long? = null,
    val taskId: Long,
    val description: String?,
    val grade: Boolean? = null,
    val teacherComment: String? = null,
    val gradedAt: String? = null,
)
