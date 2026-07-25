package ru.niksen111.repitma.auth.exception

class UsernameAlreadyExistsException(username: String) :
    RuntimeException("Пользователь с логином '$username' уже существует")
