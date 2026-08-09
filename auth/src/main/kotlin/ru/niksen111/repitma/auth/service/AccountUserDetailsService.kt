package ru.niksen111.repitma.auth.service

import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service
import ru.niksen111.repitma.users.mapper.UserMapper

@Service
class AccountUserDetailsService(
    private val userMapper: UserMapper,
) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val account = userMapper.findByUsername(username)
            ?: throw UsernameNotFoundException("User not found")

        return User.withUsername(account.username)
            .password(account.passwordHash)
            .roles(account.role.name)
            .build()
    }
}
