package ru.niksen111.repitma.auth.mapper

import org.apache.ibatis.annotations.Mapper
import ru.niksen111.repitma.auth.entity.UserAccount

@Mapper
interface UserMapper {
    fun insert(user: UserAccount): Int
    fun findByUsername(username: String): UserAccount?
}
