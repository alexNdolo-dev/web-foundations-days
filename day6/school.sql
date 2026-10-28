-- Day 6 assignment: A School Database
PRAGMA foreign_keys = ON;

-- ========== 1. TABLES ==========

CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE          -- no two students share an email
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);

-- Join table: one row = one student on one course
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  PRIMARY KEY (student_id, course_id), -- same student cannot join the same course twice
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ========== 2. SAMPLE DATA ==========

INSERT INTO students (name, email) VALUES
  ('Amina Otieno', 'amina@example.com'),
  ('Brian Kamau', 'brian@example.com'),
  ('Wanjiku Mwangi', 'wanjiku@example.com'),
  ('Kevin Odhiambo', 'kevin@example.com');

INSERT INTO courses (title) VALUES
  ('Web Development'),
  ('Databases'),
  ('Python Basics');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'A'),
  (1, 2, 'B'),
  (2, 1, 'B'),
  (3, 1, 'A'),
  (3, 3, 'C');

-- ========== 3. QUERIES ==========

-- Query 1: all courses for one student, by name
SELECT courses.title
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno';

-- Query 2: all students on one course
SELECT students.name
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students ON students.id = enrolments.student_id
WHERE courses.title = 'Web Development';

-- Query 3: number of students per course
SELECT courses.title, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id;

-- Query 4: students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.student_id IS NULL;

-- Query 5: update one enrolment's grade (Brian, Web Development: B -> A)
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 2 AND course_id = 1;