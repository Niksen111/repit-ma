# Repit MA

Веб-приложение для взаимодействия преподавателей и учеников.

## Технологии

- JDK 21, Kotlin и Spring Boot;
- Spring Security;
- MyBatis и Liquibase;
- SQLite;
- TypeScript, Vite и pnpm;
- Gradle Wrapper;
- Docker и Docker Compose.

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

Frontend доступен по адресу `http://localhost:5173`, backend — `http://localhost:8080`. Vite перенаправляет запросы `/api` на backend.

По умолчанию SQLite хранится в файле `repit-ma.db` в корне проекта. Путь можно изменить переменной окружения `REPIT_MA_DATABASE_PATH`.

При первой миграции создаётся пользователь `admin` с ролью `ADMIN`. Хеш его пароля задан в Liquibase changeset.

## Запуск в Docker

```bash
docker compose up --build
```

Приложение доступно по адресу `http://localhost:8080`. База SQLite сохраняется в каталоге `data`.

Остановка контейнера:

```bash
docker compose down
```

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

## Лицензия

[MIT](LICENSE)
