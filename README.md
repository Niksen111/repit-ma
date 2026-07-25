# Repit MA

Веб-приложение для совместной работы репетитора и учеников: расписание занятий, учебный прогресс, домашние задания, материалы и учет оплат.

Проект находится на ранней стадии. Сейчас реализована регистрация пользователей по логину и паролю с хранением данных в SQLite.

## Стек

Kotlin, Spring Boot, Spring Security, MyBatis, Liquibase, SQLite, TypeScript и Vite.

## Локальный запуск

Потребуются JDK 21, Node.js 22 и pnpm. Gradle устанавливать отдельно не нужно.

Запустите backend из корня проекта:

```powershell
.\gradlew.bat :app:bootRun
```

Затем запустите frontend в отдельном терминале:

```powershell
cd frontend
pnpm install
pnpm dev
```

Frontend будет доступен по адресу `http://localhost:5173`, backend — `http://localhost:8080`. Локальная база данных создается в файле `repit-ma.db`.

## Запуск в Docker

```bash
docker compose up --build
```

Приложение будет доступно по адресу `http://localhost:8080`. Данные SQLite сохраняются в каталоге `data`.

Остановка:

```bash
docker compose down
```

## Проверка

```powershell
.\gradlew.bat test
cd frontend
pnpm build
```

## Лицензия

[MIT](LICENSE)
