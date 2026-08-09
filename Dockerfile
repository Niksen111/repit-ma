FROM node:22-alpine AS frontend
WORKDIR /workspace/frontend

RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM eclipse-temurin:21-jdk-jammy AS backend
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle/ gradle/
COPY app/ app/
COPY auth/ auth/
COPY users/ users/
COPY courses/ courses/
COPY --from=frontend /workspace/frontend/dist/ app/src/main/resources/static/
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew :app:bootJar --no-daemon

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN useradd --system --create-home --uid 10001 repitma \
    && mkdir /data \
    && chown repitma:repitma /data

COPY --from=backend --chown=repitma:repitma /workspace/app/build/libs/*.jar app.jar

USER repitma
ENV REPIT_MA_DATABASE_PATH=/data/repit-ma.db
EXPOSE 8080
VOLUME ["/data"]

ENTRYPOINT ["java", "-jar", "app.jar"]
