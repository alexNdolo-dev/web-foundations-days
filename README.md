# QuickNotes System Design

Project 2 of the Web Foundations course.

## Description

QuickNotes started as a browser-only notes app. This project shows how it can become a real online service for **1 million users**. It has two parts:

1. **An API client** (`index.html`, `api.js`, `style.css`) that talks to the JSONPlaceholder practice API. It can load notes (GET), create a note (POST) and delete a note (DELETE), and it shows loading, success, error and empty states.
2. **Three design documents** in the `docs/` folder that the backend team can build from.

## How to run the API client

1. Download or clone this repository.
2. Open the folder in **VS Code**.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Click **Load notes** to load 10 notes from the server.
5. Type a title (required, at most 100 characters) and click the submit button to create a note.
6. Click **Delete** on a note to remove it.

The page needs an internet connection, because it calls `https://jsonplaceholder.typicode.com/posts`. JSONPlaceholder is a practice API, so it does not really save the notes you create or delete.

## Documents

- [API design](docs/api-design.md): the REST endpoints, JSON examples and error codes.
- [Data model](docs/data-model.md): the tables, relationships, SQL, index and SQL vs NoSQL choice.
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows and trade-offs.

## What I learned

- **How the web talks to a server.** A request has a method, a URL, headers and a body, and the response has a status code. I learned to use `fetch` with `async` / `await`, to check `response.ok`, and to handle errors with `try` / `catch` / `finally`.
- **How to design data.** Real apps keep data in a database with tables, primary keys and foreign keys. A many-to-many link, like notes and tags, needs a join table, and an index makes searching much faster.
- **How systems scale.** A load balancer, several stateless app servers, a cache, a CDN, a read replica and a queue each solve one problem. Every choice is a trade-off, and avoiding single points of failure keeps the system running.
