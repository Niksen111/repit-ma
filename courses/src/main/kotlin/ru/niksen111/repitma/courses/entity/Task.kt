package ru.niksen111.repitma.courses.entity

data class Task(
    var id: Long? = null,
    val lessonId: Long,
    val title: String,
    val description: String?,
)
