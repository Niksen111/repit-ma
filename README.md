# Repit MA

Веб-приложение для взаимодействия преподавателей и учеников: курсы, занятия,
учебные материалы, домашние задания, расписание и учёт оплаты.
Приложение также содержит публичные страницы преподавателей.

Backend: JDK 21, Kotlin, Spring Boot, Spring Security, MyBatis, Liquibase и SQLite.
Frontend: TypeScript, Vite и pnpm. Для сборки и запуска используются Gradle Wrapper
и Docker Compose.

## Структура проекта

- `frontend/` — интерфейс приложения и публичные страницы.
- `app/` — запускаемое Spring Boot приложение, маршруты и миграции базы.
- `auth/` — аутентификация и настройка безопасности.
- `users/` — аккаунты и профили.
- `courses/` — курсы, занятия, материалы, расписания и чеки.
- `doc/` — документация функций, API и разработки.
- `deploy/` — конфигурация и инструкции серверного развёртывания.
- `scripts/` — служебные скрипты, включая деплой.

## Локальный запуск

Потребуются JDK 21, Node.js 22 и pnpm 11.

Запустите backend из корня проекта:

```powershell
.\gradlew.bat :app:bootRun
```

В отдельном терминале установите зависимости и запустите frontend:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Frontend доступен по адресу `http://localhost:5173`, backend — `http://localhost:8080`.
Vite перенаправляет запросы `/api` на backend.

По умолчанию SQLite хранится в файле `repit-ma.db` в корне проекта.
Путь можно изменить переменной окружения `REPIT_MA_DATABASE_PATH`.
При первой миграции создаётся пользователь `admin` с ролью `ADMIN`;
хеш его пароля задан в Liquibase changeset.

## Запуск в Docker

```bash
docker compose up --build
```

Приложение доступно по адресу `http://localhost:8080`.
База SQLite сохраняется в каталоге `data`.

Остановка контейнера:

```bash
docker compose down
```

## Документация

- [Курсы, занятия, расписание и API](doc/courses.md).
- [Разработка, проверки и логирование](doc/development.md).
- [Публичные страницы преподавателей](doc/public-sites.md).
- [Релизы и серверный деплой](deploy/README.md).

## Лицензия

[MIT](LICENSE)
