package ru.niksen111.repitma.users.exception

class UsernameAlreadyExistsException(username: String) :
    RuntimeException("Пользователь с логином '$username' уже существует")
