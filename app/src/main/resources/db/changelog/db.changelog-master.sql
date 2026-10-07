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
    CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')) default 'STUDENT';

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

--changeset niksen111:005-create-courses
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users (id),
    FOREIGN KEY (student_id) REFERENCES users (id),
    CHECK (teacher_id <> student_id),
    UNIQUE (teacher_id, student_id, academic_year)
);

CREATE INDEX ix_courses_teacher ON courses (teacher_id);
CREATE INDEX ix_courses_student ON courses (student_id);

--rollback DROP INDEX ix_courses_student;
--rollback DROP INDEX ix_courses_teacher;
--rollback DROP TABLE courses;

--changeset niksen111:006-create-course-learning-materials
CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id)
);

CREATE INDEX ix_lessons_course_scheduled ON lessons (course_id, scheduled_at);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons (id)
);

CREATE INDEX ix_tasks_lesson ON tasks (lesson_id);

CREATE TABLE solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    description TEXT,
    grade INTEGER CHECK (grade IN (0, 1)),
    teacher_comment TEXT,
    graded_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks (id)
);

CREATE TABLE course_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content BLOB NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lesson_files (
    lesson_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, file_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons (id),
    FOREIGN KEY (file_id) REFERENCES course_files (id)
);

CREATE TABLE task_files (
    task_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, file_id),
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (file_id) REFERENCES course_files (id)
);

CREATE TABLE solution_files (
    solution_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (solution_id, file_id),
    FOREIGN KEY (solution_id) REFERENCES solutions (id),
    FOREIGN KEY (file_id) REFERENCES course_files (id)
);

--rollback DROP TABLE solution_files;
--rollback DROP TABLE task_files;
--rollback DROP TABLE lesson_files;
--rollback DROP TABLE course_files;
--rollback DROP TABLE solutions;
--rollback DROP INDEX ix_tasks_lesson;
--rollback DROP TABLE tasks;
--rollback DROP INDEX ix_lessons_course_scheduled;
--rollback DROP TABLE lessons;

--changeset niksen111:007-lesson-tracking-and-receipts
ALTER TABLE lessons ADD COLUMN outcome TEXT NOT NULL DEFAULT 'AUTO'
    CHECK (outcome IN ('AUTO', 'HELD', 'CANCELLED'));
ALTER TABLE lessons ADD COLUMN paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1));

CREATE TABLE lesson_receipts (
    lesson_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, file_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons (id),
    FOREIGN KEY (file_id) REFERENCES course_files (id)
);

--rollback DROP TABLE lesson_receipts;
--rollback ALTER TABLE lessons DROP COLUMN paid;
--rollback ALTER TABLE lessons DROP COLUMN outcome;
