package ru.niksen111.repitma.courses.entity

data class CourseFile(
    var id: Long? = null,
    val originalName: String,
    val contentType: String,
    val content: ByteArray,
)
