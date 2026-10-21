# Library API Design

A REST API for a library's **books** resource. The resource name is a plural noun (`/books`), the HTTP method says what to do, and a single book is addressed by its id (`/books/12`).

## Book object

```json
{
  "id": 12,
  "title": "Weep Not, Child",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908300",
  "year": 1964,
  "available": true
}
```

## Endpoints

### 1. List all books

- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns an array of all books in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book

- **Method:** `GET`
- **Path:** `/books/{id}` (e.g. `/books/12`)
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book

- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book; the server assigns the id and returns the created book.
- **Example request body:**

```json
{
  "title": "A Grain of Wheat",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908454",
  "year": 1967
}
```

- **Success status:** `201 Created`

### 4. Update a book (replace)

- **Method:** `PUT`
- **Path:** `/books/{id}` (e.g. `/books/12`)
- **Description:** Replaces the whole book with the new version.
- **Example request body:**

```json
{
  "title": "A Grain of Wheat",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908454",
  "year": 1967,
  "available": true
}
```

- **Success status:** `200 OK`

### 5. Update part of a book

- **Method:** `PATCH`
- **Path:** `/books/{id}` (e.g. `/books/12`)
- **Description:** Changes only the fields sent, such as marking a book as borrowed.
- **Example request body:**

```json
{
  "available": false
}
```

- **Success status:** `200 OK`

### 6. Delete a book

- **Method:** `DELETE`
- **Path:** `/books/{id}` (e.g. `/books/12`)
- **Description:** Removes the book from the library.
- **Request body:** none
- **Success status:** `204 No Content`

### 7. List books by an author

- **Method:** `GET`
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only the books whose author matches the `author` query parameter.
- **Request body:** none
- **Success status:** `200 OK` (an empty array `[]` if the author has no books)

## Error codes

### 400 Bad Request

- The request itself is invalid, so the server rejects it.
- **Example:** `POST /books` with an empty title, or with `"year": "abc"` instead of a number.
- **Example response body:**

```json
{ "error": "title is required" }
```

### 404 Not Found

- The book or URL does not exist.
- **Example:** `GET /books/9999` when no book has id 9999, or `DELETE /books/9999` for a book that was already removed.
- **Example response body:**

```json
{ "error": "Book 9999 not found" }
```