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

--changeset niksen111:002-add-user-role
ALTER TABLE users ADD COLUMN role TEXT NOT NULL
    CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT'));

INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2a$10$.dfRApHaMgnclngtgpB.mOJ/qs17EbMr2A7Ia8KLGdXM/WeNH.c2e',
    'ADMIN'
);

--rollback DELETE FROM users WHERE username = 'admin';
--rollback ALTER TABLE users DROP COLUMN role;
