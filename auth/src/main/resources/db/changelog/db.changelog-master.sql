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

--changeset niksen111:003-add-profile-fields
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN telegram TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN profile_consent_at TEXT;

--rollback ALTER TABLE users DROP COLUMN profile_consent_at;
--rollback ALTER TABLE users DROP COLUMN city;
--rollback ALTER TABLE users DROP COLUMN telegram;
--rollback ALTER TABLE users DROP COLUMN name;

--changeset niksen111:004-add-vk-and-grade
ALTER TABLE users ADD COLUMN vk TEXT;
ALTER TABLE users ADD COLUMN grade INTEGER CHECK (grade BETWEEN 1 AND 11);

--rollback ALTER TABLE users DROP COLUMN grade;
--rollback ALTER TABLE users DROP COLUMN vk;
