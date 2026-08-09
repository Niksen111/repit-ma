package ru.niksen111.repitma.users.service

import org.springframework.stereotype.Service
import ru.niksen111.repitma.users.dto.TeacherSummaryResponse
import ru.niksen111.repitma.users.mapper.UserMapper
import ru.niksen111.repitma.users.entity.UserRole

@Service
class TeacherDirectoryService(
    private val userMapper: UserMapper,
) {
    fun teachers(): List<TeacherSummaryResponse> = userMapper.findByRole(UserRole.TEACHER).map {
        TeacherSummaryResponse(requireNotNull(it.id), it.username, it.name)
    }
}
