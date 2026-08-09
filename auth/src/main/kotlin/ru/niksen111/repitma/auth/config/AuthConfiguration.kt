package ru.niksen111.repitma.auth.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableMethodSecurity
class AuthConfiguration {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.disable() }
        .authorizeHttpRequests {
            it.requestMatchers(
                "/", "/index.html", "/login", "/register", "/account",
                "/assets/**", "/error",
            ).permitAll()
                .requestMatchers("/api/auth/register").hasRole("ADMIN")
                .anyRequest().authenticated()
        }
        .httpBasic {
            it.authenticationEntryPoint { _, response, _ ->
                response.status = 401
            }
        }
        .build()
}
