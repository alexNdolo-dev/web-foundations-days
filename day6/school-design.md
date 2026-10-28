# School Database Design

This is a small database for a school. It stores students, the courses they can take, and which student is on which course (with a grade).

## What each table is for

- **students**: one row per student. It holds the student's `id`, `name` and `email`. The email is unique, so two students cannot share one.
- **courses**: one row per course. It holds the course's `id` and `title`.
- **enrolments**: one row each time a student joins a course. It holds the `student_id`, the `course_id` and the `grade`.

## Relationships

- **One-to-many: students to enrolments.** One student can have many enrolments. The "many" table (`enrolments`) holds the foreign key `student_id`.
- **One-to-many: courses to enrolments.** One course can have many enrolments. `enrolments` also holds the foreign key `course_id`.
- **Many-to-many: students and courses.** One student can take many courses, and one course can have many students.

### Why a join table is needed

A single column cannot hold a list like "Web Development, Databases". That breaks the rule of one value per column. So we use a third table, `enrolments`, that stores one pair of ids per row.

The grade belongs to the pair (this student on this course), so it also lives in the join table.

The primary key of `enrolments` is `(student_id, course_id)`. This stops the same student enrolling on the same course twice.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

**Reason:** the primary key `(student_id, course_id)` already makes searching by student fast. But we often search by course (for example "all students on Web Development" and "students per course"). Without this index, the database would check every row in `enrolments`. With it, it jumps straight to the matching rows.

## SQL or NoSQL?

I would choose **SQL**. The data has a clear structure (students, courses, enrolments) and clear links between them. SQL is very good at these links, and joins make questions like "which students are on this course?" simple. SQL also enforces rules in the database itself: unique emails, no double enrolment, and no enrolment for a student or course that does not exist. These rules matter for school records, where correct data is important. A NoSQL document database is more flexible, but it is weaker at links and rules, so it would be a worse fit here.