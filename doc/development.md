# Разработка и проверки

Команды выполняются из корня репозитория, если не указан переход в `frontend/`.
Инструкции запуска находятся в [главном README](../README.md).

## Проверка

Backend-тесты:

```powershell
.\gradlew.bat test
```

Проверка типов и production-сборка frontend:

```powershell
cd frontend
pnpm build
```

Frontend-тесты (Node.js 24+):

```powershell
cd frontend
pnpm test
```

## Логирование

В Kotlin-коде используется `KotlinLogging.logger {}` из `kotlin-logging-jvm`.
Это обёртка над SLF4J; вывод и настройку обеспечивает стандартный Logback
из Spring Boot. Сообщения записываются через `logger.info { "..." }`, ошибки —
через `logger.error(exception) { "..." }`, чтобы сохранить стек исключения.
Лямбда сообщения вычисляется только при включённом уровне логирования.

Логи выводятся в консоль и доступны через Docker logs. Уровни можно настроить
обычными свойствами Spring Boot, например
`logging.level.ru.niksen111.repitma.courses=DEBUG`.

## Связанные документы

- [Устройство курсов и API](courses.md).
- [Публичные страницы преподавателей](public-sites.md).
- [Релизы и серверный деплой](../deploy/README.md).
