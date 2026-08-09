package ru.niksen111.repitma.users.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import ru.niksen111.repitma.users.entity.UserAccount
import ru.niksen111.repitma.users.entity.UserRole

@Mapper
interface UserMapper {
    fun insert(user: UserAccount): Int
    fun findByUsername(username: String): UserAccount?
    fun findById(id: Long): UserAccount?
    fun findByRole(@Param("role") role: UserRole): List<UserAccount>
    fun updateProfile(
        @Param("id") id: Long,
        @Param("name") name: String?,
        @Param("telegram") telegram: String?,
        @Param("city") city: String?,
        @Param("vk") vk: String?,
        @Param("grade") grade: Int?,
        @Param("profileConsentAt") profileConsentAt: String?,
    ): Int
}
