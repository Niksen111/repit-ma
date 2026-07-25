--liquibase formatted sql

--changeset niksen111:001-create-users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_users_username_nocase
    ON users (username COLLATE NOCASE);

--rollback DROP INDEX uq_users_username_nocase;
--rollback DROP TABLE users;
