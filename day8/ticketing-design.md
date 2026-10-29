# TicketHub: Design Document

**Author:** Alex
**Project:** Event ticketing website for concerts and events

## 1. Context

TicketHub is a website that sells tickets for concerts and events. It serves fans who want to find an event, pick their seats and pay quickly and fairly. The hardest moment for the system is when a very popular concert goes on sale and about 200,000 people compete for 20,000 seats within ten minutes.

### Goals

- Let users browse events, view seats, hold seats and pay for them.
- Never sell the same seat twice.
- Stay fast and available during a big sale.

### Non-goals

- Customer-requested refunds, resale of tickets between users and dynamic pricing. (The system still refunds automatically if a payment succeeds but the seats can no longer be sold.)
- Supporting several currencies or payment providers at launch.
- Building our own payment processing (we use an external payment provider).

## 2. Requirements

### Functional requirements

- Users can register and log in.
- Users can browse and search events by title and date.
- Users can view an event's details and its seat map, with each seat's status (available, held or sold).
- Users can hold one or more seats temporarily (for example, 10 minutes) while they pay.
- Users can release a hold they no longer want.
- Users can pay for held seats and receive their tickets.
- Users can view their past orders and tickets.

### Non-functional requirements

- **Correctness:** a seat is never sold to two people. This matters more than any other requirement.
- **Speed:** event pages and seat maps load in under 300 ms for 95% of requests under normal traffic.
- **Availability:** 99.9% uptime, and browsing keeps working even if payments or emails are slow.
- **Fairness:** during a big sale, buyers are served roughly first come, first served, and bots or refresh-spamming cannot jump the queue.
- **Scalability:** the system handles the normal day and the big-sale spike, which is about 130 times more traffic.
- **Security:** all traffic uses HTTPS, users are identified by tokens, passwords are stored as hashes and card details never touch our servers.

## 3. Estimates

I use the rounding rule from Day 7: 1 day is about 100,000 seconds, and peak traffic is about 5 times the average.

### Assumptions

- 2,000,000 registered users.
- 50,000 visitors on a normal day, each viewing 10 pages.
- 5,000 tickets sold on a normal day.
- Big sale: 200,000 people try to buy 20,000 seats within the first 10 minutes (600 seconds).
- During the big sale, each person makes about 10 requests (event page, seat map refreshes, hold attempts).
- An average ticket order row is about 500 bytes.

### Normal day

```
Page views per day: 50,000 visitors x 10 pages = 500,000
Average:            500,000 / 100,000 = 5 page views per second
Peak (x5):          about 25 page views per second

Tickets sold:       5,000 per day
Average:            5,000 / 100,000 = 0.05 sales per second
Peak (x5):          about 0.25 sales per second (one sale every 4 seconds)

Storage per year:   5,000 tickets x 365 = about 1.8 million tickets
                    1.8 million x 500 bytes = about 0.9 GB per year
```

### Big sale (first 10 minutes)

```
Arrival rate:       200,000 users / 600 seconds = about 333 users per second
Request rate:       333 users/s x 10 requests = about 3,300 requests per second
Maximum sales:      20,000 seats / 600 seconds = about 33 seats sold per second
Competition:        200,000 people / 20,000 seats = 10 people for every seat
```

### Comparison

| Measure | Normal day (peak) | Big sale | Increase |
|---|---|---|---|
| Requests per second | about 25 | about 3,300 | about 130 times |
| Sales per second | about 0.25 | about 33 | about 130 times |
| Competition per seat | almost none | 10 people per seat | n/a |

### What the estimates tell us

- On a normal day the system is read-heavy (browsing) and very light. One or two ordinary servers could handle it.
- Storage is tiny: under 1 GB a year fits easily in one well-configured database. Storage is not the problem.
- The big sale is the real design challenge. Traffic jumps about 130 times in a few minutes, and thousands of people fight for the same rows at the same moment, so the problem is concurrency (correctness under competition), not storage.
- Because we know the sale date in advance, we can add servers and open a waiting room before it starts instead of reacting afterwards.

## 4. API Design

The API follows REST: resources are plural nouns, the HTTP method says the action, and every request carries the user's token, so the server stays stateless. Protected endpoints need the header `Authorization: Bearer <token>`.

### Endpoints

| # | Method | Path | What it does | Success |
|---|---|---|---|---|
| 1 | POST | /auth/login | Log in with email and password, returns a token | 200 OK |
| 2 | GET | /events | List and search events (`?search=rock&date=2026-12-05`) | 200 OK |
| 3 | GET | /events/{id} | Get the details of one event | 200 OK |
| 4 | GET | /events/{id}/seats | View the seat map with each seat's status | 200 OK |
| 5 | POST | /events/{id}/holds | Hold one or more seats for 10 minutes | 201 Created |
| 6 | DELETE | /holds/{id} | Release a hold the user no longer wants | 204 No Content |
| 7 | POST | /orders | Pay for a hold and receive the tickets | 201 Created |
| 8 | GET | /orders | List the logged-in user's orders and tickets | 200 OK |
| 9 | GET | /orders/{id} | View one order | 200 OK |
| 10 | POST | /users | Register a new account | 201 Created |

### Example requests and responses

**1. Log in**

```http
POST /auth/login
Content-Type: application/json

{ "email": "amina@example.com", "password": "mypassword" }
```

```http
200 OK

{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**4. View the seat map**

```http
GET /events/42/seats?section=A

200 OK

[
  { "id": 101, "section": "A", "row": "1", "number": 1, "price": 5000, "status": "available" },
  { "id": 102, "section": "A", "row": "1", "number": 2, "price": 5000, "status": "held" },
  { "id": 103, "section": "A", "row": "1", "number": 3, "price": 5000, "status": "sold" }
]
```

**5. Hold seats**

```http
POST /events/42/holds
Authorization: Bearer <token>
Content-Type: application/json

{ "seatIds": [101, 104] }
```

```http
201 Created

{ "holdId": 7, "seatIds": [101, 104], "expiresAt": "2026-12-05T10:10:00Z" }
```

**7. Pay for the hold**

```http
POST /orders
Authorization: Bearer <token>
Idempotency-Key: 5f3c9a1e-77a2-4c1b-9d2e-0a1b2c3d4e5f
Content-Type: application/json

{ "holdId": 7, "paymentToken": "tok_abc123" }
```

```http
201 Created

{ "orderId": 15, "eventId": 42, "seatIds": [101, 104], "total": 10000, "status": "paid" }
```

The `Idempotency-Key` header is a unique value the browser generates for each payment attempt. If the user double-clicks "Pay" or the network retries the request, the server sees the same key and returns the first result instead of charging twice.

**8. My orders**

```http
GET /orders
Authorization: Bearer <token>

200 OK

[
  { "orderId": 15, "eventTitle": "Nairobi Live", "seats": 2, "total": 10000, "status": "paid" }
]
```

**10. Register**

```http
POST /users
Content-Type: application/json

{ "name": "Amina Otieno", "email": "amina@example.com", "password": "mypassword" }
```

```http
201 Created

{ "id": 1, "name": "Amina Otieno", "email": "amina@example.com" }
```

### Error codes

| Code | Meaning | Example in TicketHub |
|---|---|---|
| 400 Bad Request | The request is invalid | `seatIds` is empty, or the user asks to hold more than 6 seats at once |
| 401 Unauthorized | Not logged in or invalid token | Holding a seat without a token, or with an expired token |
| 403 Forbidden | Logged in but not allowed | Viewing another user's order with `GET /orders/99` |
| 404 Not Found | The item does not exist | `GET /events/9999` for an event that does not exist |
| 409 Conflict | The request clashes with the current state | Seat 101 was already held or sold to someone else, the hold has expired before payment, or someone registers with an email that already exists |
| 429 Too Many Requests | Rate limit exceeded | A script sends 100 hold requests in one second |
| 500 Internal Server Error | Something broke on the server | The database is unreachable |

The most important code is **409 Conflict**. It is how the API tells a user "someone else got that seat first", and it is the visible side of the double-booking protection explained in section 6.

## 5. Data Model

The data is relational: users buy seats at events, and every link must be correct. SQL fits well because of its foreign keys, constraints and transactions, which are exactly what we need to stop double-booking. The API's `holdId` needs somewhere to live, so there is a `holds` table, and an order can contain several seats, so there is an `order_items` table. Together with the four core tables (users, events, seats and orders), that makes six tables in total.

### Tables

| Table | What it is for |
|---|---|
| users | People who can log in and buy tickets |
| events | Concerts and events that are on sale |
| seats | Every seat of every event, with its current status |
| holds | A temporary reservation of seats by one user (about 10 minutes) |
| orders | A completed, paid purchase |
| order_items | Links an order to the seats it contains (one row per ticket) |

### Relationships

```
users 1 ----< holds >---- 1 events
users 1 ----< orders >--- 1 events
events 1 ----< seats
holds  1 ----< seats        (seats.hold_id, while a seat is held)
orders 1 ----< order_items >---- 1 seats   (UNIQUE seat_id)
```

- **One-to-many:** one user has many orders and many holds. One event has many seats. One hold covers many seats. In each case the "many" table holds the foreign key.
- **One order, many seats:** an order can contain several seats, so `order_items` stores one row per seat. Each seat can appear in at most one order, which is enforced by `UNIQUE (seat_id)`.

### SQL

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  venue      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  on_sale_at TEXT NOT NULL
);

CREATE TABLE holds (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  event_id   INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE seats (
  id          INTEGER PRIMARY KEY,
  event_id    INTEGER NOT NULL,
  section     TEXT NOT NULL,
  row_label   TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'held', 'sold')),
  hold_id     INTEGER,
  held_until  TEXT,
  UNIQUE (event_id, section, row_label, seat_number),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (hold_id)  REFERENCES holds(id)
);

CREATE TABLE orders (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  event_id        INTEGER NOT NULL,
  total           INTEGER NOT NULL CHECK (total >= 0),
  status          TEXT NOT NULL DEFAULT 'paid',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE order_items (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  seat_id  INTEGER NOT NULL UNIQUE,   -- a seat can be sold only once
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id)  REFERENCES seats(id)
);
```

### Constraints and why they exist

- `users.email UNIQUE`: no two accounts share an email, and login looks users up by it.
- `seats UNIQUE (event_id, section, row_label, seat_number)`: the same physical seat cannot be created twice for an event.
- `seats.status CHECK (...)`: a seat can only ever be `available`, `held` or `sold`, never a typo.
- `order_items.seat_id UNIQUE`: the database itself refuses to sell the same seat twice (explained in section 6).
- `orders.idempotency_key UNIQUE`: a repeated payment request cannot create a second order.
- Prices are stored as whole numbers (the smallest currency unit, for example cents) to avoid rounding errors with decimals.
- Passwords are stored only as hashes, never as plain text.

### Indexes

```sql
CREATE INDEX idx_seats_event_status ON seats(event_id, status);
CREATE INDEX idx_seats_hold ON seats(hold_id);
CREATE INDEX idx_holds_expires ON holds(expires_at);
CREATE INDEX idx_orders_user ON orders(user_id);
```

| Index | Why |
|---|---|
| seats(event_id, status) | The seat map and "how many seats are left" filter by event and status, and these are the most frequent queries |
| seats(hold_id) | Releasing or paying for a hold finds all seats of that hold quickly |
| holds(expires_at) | The background worker finds expired holds without scanning the whole table |
| orders(user_id) | `GET /orders` lists one user's orders |

Already indexed automatically: all primary keys, `users.email`, `order_items.seat_id` and `orders.idempotency_key` (because they are UNIQUE). Indexes make reads faster but slow writes slightly, so I only index columns that are searched often.

### Size check

A big event has 20,000 seat rows at roughly 200 bytes each, which is about 4 MB per event. Even with hundreds of events per year, the seats table stays small, so one primary database with a read replica is enough and sharding is not needed.

## 6. Preventing Double-Booking

Selling the same seat to two people is the worst failure TicketHub can have, so the design does not trust the cache, the app servers or the user interface to prevent it. The database decides, using three layers: an atomic conditional update, a transaction and a unique constraint.

### The problem

Imagine Amina and Brian both click seat 101 at the same instant. The app servers handling them are different machines, and both servers may have just read the seat as `available`. If the code did "read the status, then write the new status" as two separate steps, both could succeed. This is called a race condition.

### Layer 1: atomic conditional update (holding seats)

Holding a seat is a single `UPDATE` whose `WHERE` clause contains the rule. The check and the change happen as one indivisible step:

```sql
BEGIN TRANSACTION;

-- Create the hold (expires in 10 minutes)
INSERT INTO holds (user_id, event_id, expires_at)
VALUES (?, ?, datetime('now', '+10 minutes'));
-- the server reads the new hold's id with last_insert_rowid()

-- Run once for each seat the user asked for
UPDATE seats
SET status = 'held',
    hold_id = ?,
    held_until = datetime('now', '+10 minutes')
WHERE id = ?
  AND event_id = ?
  AND (status = 'available'
       OR (status = 'held' AND held_until < datetime('now')));

-- After every UPDATE the server checks how many rows changed:
--   1 row  -> this user got the seat
--   0 rows -> someone else has it: ROLLBACK and reply 409 Conflict

COMMIT;
```

Why it is safe:

- If Amina and Brian both run this at the same moment, the database processes the two updates on that seat row one after the other, never at the same time.
- The first update finds `status = 'available'` and changes it to `held`.
- The second update then re-checks its `WHERE` clause, finds the seat is already `held` with a future `held_until`, matches zero rows and changes nothing. Brian gets 409.
- The seat is never "read and then written". The condition and the change are the same statement.

If the user asked for two seats and only one was available, the transaction is rolled back, so they do not end up holding half of what they wanted. To stop two users who ask for overlapping seats from blocking each other (a deadlock), the server always updates the seats in ascending id order.

### Layer 2: a transaction (paying)

Paying changes several tables at once: the seats, the order and the order items. A transaction makes them all-or-nothing (atomicity):

```sql
BEGIN TRANSACTION;

-- Mark the held seats as sold, but only if this user's hold is still valid
UPDATE seats
SET status = 'sold'
WHERE hold_id = ?
  AND status = 'held'
  AND held_until > datetime('now')
  AND EXISTS (SELECT 1 FROM holds
              WHERE holds.id = seats.hold_id AND holds.user_id = ?);
-- The server checks that the number of changed rows equals the number of seats
-- in the hold. If not (the hold expired or is not theirs): ROLLBACK, reply 409.

-- Record the purchase
INSERT INTO orders (user_id, event_id, total, idempotency_key)
VALUES (?, ?, ?, ?);

INSERT INTO order_items (order_id, seat_id)
SELECT ?, id FROM seats WHERE hold_id = ?;

COMMIT;
```

What each ACID property gives us here:

- **Atomicity:** the seats become `sold`, the order exists and the order items exist, or none of it happens. A crash halfway cannot leave a paid order with unsold seats.
- **Consistency:** the `CHECK`, `NOT NULL`, foreign key and unique rules are never broken.
- **Isolation:** two buyers' transactions running at once do not see each other's half-finished work.
- **Durability:** once `COMMIT` returns, the sale survives a crash or power cut.

### Layer 3: the unique constraint (the safety net)

```sql
seat_id INTEGER NOT NULL UNIQUE   -- in order_items
```

Even if a future bug in the application code tried to sell a seat that was already sold, the second `INSERT INTO order_items` would fail because that `seat_id` already exists. The database refuses and the transaction is rolled back. This is why rules live in the database and not only in server code: there are many servers and many code versions, and the database is the one place every change must pass through.

### Walkthrough: two people, one seat

| Time | Amina | Brian | Seat 101 |
|---|---|---|---|
| 10:00:00.000 | Clicks seat 101 | Clicks seat 101 | available |
| 10:00:00.010 | Her `UPDATE` matches 1 row | Waits for the row | held by Amina |
| 10:00:00.015 | Gets 201 Created, hold #7 | His `UPDATE` re-checks: 0 rows | held by Amina |
| 10:00:00.020 | Sees the payment page | Gets 409 Conflict, "seat taken" | held by Amina |
| 10:04:00 | Pays, transaction commits | Picks another seat | sold |

If Amina never paid, her hold would expire at 10:10 and the seat would return to `available`.

### Expired holds

A hold must not lock a seat forever. Two things handle this:

1. The conditional update in Layer 1 treats a seat whose `held_until` is in the past as available, so an expired hold never blocks a buyer, even before cleanup runs.
2. A background worker, started from the queue every minute, tidies up:

```sql
UPDATE seats
SET status = 'available', hold_id = NULL, held_until = NULL
WHERE status = 'held' AND held_until < datetime('now');
```

When a user releases a hold themselves (`DELETE /holds/{id}`), the server runs:

```sql
UPDATE seats
SET status = 'available', hold_id = NULL, held_until = NULL
WHERE hold_id = ? AND status = 'held';
```

### Payments and retries

- The `Idempotency-Key` sent with `POST /orders` is stored in `orders.idempotency_key`, which is `UNIQUE`. Before charging anything, the server looks for an existing order with that key and, if one exists, returns it. The same key is also passed to the payment provider, so even two requests arriving at the same instant cannot charge the card twice, and the unique rule is the final safety net.
- The server verifies that the hold is valid before asking the payment provider to charge the card. If the final transaction still fails after a successful charge (for example, the hold expired during the payment), the server refunds the payment automatically and replies 409.

### What we deliberately do not rely on

- **The cache:** the seat map shown to users may be a few seconds old. It is only a display. A user may click a seat that is already taken, but the hold step above checks the real database and replies 409.
- **The browser:** a button that looks disabled cannot be trusted, because users can send requests directly with curl or a script.
- **App server memory:** servers are stateless, and any server may receive any request, so the truth must be in the shared database.
- **The waiting room:** it controls how fast people arrive, which helps fairness and load, but it does not guarantee correctness. The database does.

### Optional test (sqliteonline.com)

You can show the protection working. After creating the tables from section 5, run:

```sql
INSERT INTO users (name, email, password_hash) VALUES ('Amina', 'a@example.com', 'x');
INSERT INTO users (name, email, password_hash) VALUES ('Brian', 'b@example.com', 'y');
INSERT INTO events (title, venue, starts_at, on_sale_at)
VALUES ('Nairobi Live', 'Uhuru Gardens', '2026-12-05', '2026-11-01');
INSERT INTO seats (event_id, section, row_label, seat_number, price)
VALUES (1, 'A', '1', 1, 5000);
INSERT INTO holds (user_id, event_id, expires_at)
VALUES (1, 1, datetime('now', '+10 minutes'));
INSERT INTO holds (user_id, event_id, expires_at)
VALUES (2, 1, datetime('now', '+10 minutes'));

-- Amina's attempt
UPDATE seats SET status = 'held', hold_id = 1, held_until = datetime('now', '+10 minutes')
WHERE id = 1 AND (status = 'available' OR (status = 'held' AND held_until < datetime('now')));
SELECT changes();   -- shows 1: Amina got the seat

-- Brian's attempt, same seat
UPDATE seats SET status = 'held', hold_id = 2, held_until = datetime('now', '+10 minutes')
WHERE id = 1 AND (status = 'available' OR (status = 'held' AND held_until < datetime('now')));
SELECT changes();   -- shows 0: Brian is refused (the server would reply 409)
```

## 7. Architecture

### Diagram

```
                      Users (browser / phone)
                               |
                              DNS                 (tickethub.com -> IP address)
                               |
          +--------------------+---------------------+
          |                                          |
   CDN (HTML, CSS, JS,                        Waiting room
   event images)                        (virtual queue, big sales only)
                                                     |
                                                     v
                                   Load balancer + rate limiting
                                     |         |         |
                                  App 1      App 2      App 3 ... (stateless)
                                     |         |         |
        +----------------------------+---------+---------+-------------------+
        |                            |                   |                   |
        v                            v                   v                   v
   Cache (Redis)               Primary DB          Read replicas          Queue
   event pages,                holds, sales,       browsing reads           |
   seat map (2 s TTL)          orders (writes)     (copies of primary)      v
                                     |                                   Workers
                                     +---- copies changes ---> replicas  - email tickets
                                                                         - release expired holds
   App servers also call:  Payment provider (external)                   - confirm payments

   Monitoring and alerts watch every box above (logs, metrics, alerts)
```

### What each component does

| Component | The problem it solves |
|---|---|
| DNS | Turns the name tickethub.com into the IP address of our servers, so users do not need to know numbers. |
| CDN | Serves static files and event images from a server near the user, so our own servers only handle API calls and pages load faster. |
| Waiting room | Lets users into a big sale at a controlled rate instead of all at once, which protects the servers and gives everyone a fair, first-come place in line. |
| Load balancer with rate limiting | Spreads requests across the app servers, skips servers that fail their health check, and answers 429 to bots and scripts that send too many requests. |
| App servers (stateless) | Run the API code; because they keep no data in memory, we can add more of them for a sale and any server can handle any request. |
| Cache (Redis) | Keeps event pages and the seat map in memory for a couple of seconds, so thousands of reads per second do not reach the database. |
| Primary database | Holds the one true copy of the data and runs the holds, payments and constraints that stop double-booking. |
| Read replicas | Copy the primary's data and answer browsing reads, so browsing never competes with people buying seats. |
| Message queue | Lets the app reply to the buyer immediately and leaves slow jobs (emails, cleanup) to wait their turn instead of overloading the system. |
| Workers | Take jobs from the queue and do them in the background: email the tickets, free expired holds and confirm payments. |
| Payment provider | Takes and processes card payments, so we never store card details and do not have to build payments ourselves. |
| Monitoring and alerts | Logs, metrics and alerts show the error rate, the 95th percentile latency, the cache hit rate and database load, so engineers see problems before users do. |

### How requests flow

**Loading the site.** The browser asks DNS for tickethub.com. The HTML, CSS, JavaScript and images come from the nearest CDN edge server, so the user sees the page in tens of milliseconds.

**Browsing events and viewing the seat map (`GET /events/42/seats`).**
1. The load balancer sends the request to a healthy app server.
2. The server checks the token and identifies the user.
3. It looks in Redis for the seat map of event 42. On a cache hit the answer comes back in about 1 ms.
4. On a miss, it queries a read replica, saves the result in Redis for 2 seconds and replies.

**Holding seats (`POST /events/42/holds`).**
1. The request goes through the load balancer, which applies the rate limit, to any app server.
2. The server runs the conditional update inside a transaction on the primary database (section 6).
3. If every seat was won, it replies 201 Created with the hold id and expiry time. If any seat was taken, it rolls back and replies 409 Conflict.
4. It does not delete the cached seat map on every hold. During a big sale that would happen about 33 times per second and the cache would stop protecting the database. The seat map simply expires after its 2-second TTL, and the 409 reply covers any stale view (trade-off 1).

**Paying (`POST /orders`).**
1. The server validates the hold, then asks the payment provider to charge the card using the payment token.
2. It runs the payment transaction on the primary: seats become `sold`, the order and order items are inserted, and the unique constraint guards each seat.
3. It adds a job "email tickets for order 15" to the queue and replies 201 Created immediately.
4. A worker picks up the job and sends the email in the background.

**When something breaks.** If App 2 crashes, the load balancer's health check stops sending it traffic within seconds, and requests that failed are retried on a healthy server. Because servers are stateless and the data is in the database, no seat or order is lost. If the email workers fall behind, buyers still get their tickets in "My orders" and the emails arrive a little later (graceful degradation).

### How it survives the big sale

Estimated peak: about 3,300 requests per second, with about 33 seats sold per second at most.

1. **We know the date in advance, so we scale out before it starts.** Assuming one app server handles about 500 requests per second, 7 servers cover the peak, and we run 10 to leave room for a server failure. After the sale we scale back down to save money.
2. **The waiting room smooths the spike.** Instead of 200,000 people hitting the seat endpoints in the same minute, it admits users at a steady rate (for example, 100 new users per second). People who arrive later wait in line and see their position, rather than seeing errors.
3. **The cache absorbs the reads.** With a 2-second TTL, the seat map for one event reaches the database about once every 2 seconds, however many thousands of people are looking at it.
4. **Only holds and payments reach the primary database.** At most about 33 sales per second is a small write load for one well-configured database, and each hold is a fast single-row conditional update on an indexed row.
5. **Rate limiting removes bots.** Each user or IP address may only make a limited number of requests per minute, so scripts cannot flood the seat endpoints.
6. **Timeouts and retries with back-off.** If the database or the payment provider is slow, requests fail fast after a few seconds and clients retry after waiting longer each time (1 s, 2 s, 4 s), so a struggling service is not flooded further.
7. **Correctness never depends on the scaled-out parts.** However many servers or cache copies exist, the database's conditional update and unique constraint decide who gets each seat.

### Single points of failure

- App servers: several behind a load balancer.
- Database: a read replica can be promoted to primary if the primary fails (failover).
- Cache: if Redis goes down, requests fall back to the replicas, slower but still correct, with the rate limit protecting the database.
- Load balancer: a cloud load balancer is itself spread over several machines.

### Why we did not choose a more complex design

TicketHub stays a well-organised monolith (one API application) rather than microservices, and the database is not sharded. The estimates show under 1 GB of new data per year and about 33 sales per second at peak, which one primary database handles comfortably. We split things up later only if there is a clear reason.

## 8. Trade-offs

Every decision gains something and costs something. These are the main choices in TicketHub.

### 1. Speed vs freshness (caching the seat map)

- **Choice:** the seat map is cached in Redis for 2 seconds.
- **Gain:** thousands of people can look at the seat map per second without reaching the database, so pages stay fast.
- **Cost:** a user may see a seat as available that was taken a moment ago. They click it and get a 409 "seat taken" message.
- **Why we accept it:** the cache is only a display. The hold step checks the real database, so correctness is never at risk. A slightly out-of-date picture is an annoyance, not a double sale.

### 2. Correctness vs availability (refuse rather than oversell)

- **Choice:** when the system is unsure, it refuses the request (409 or a wait in the queue) instead of risking a second sale.
- **Gain:** a seat is never sold twice, and the database remains the single source of truth.
- **Cost:** some users see errors or "try again" messages during the sale, and a database problem blocks purchases.
- **Why we accept it:** for tickets, one oversold seat means an angry customer and a refund. A rejected click costs nothing. A bank balance works the same way. A notes app could choose the opposite.

### 3. Fairness vs simplicity (the waiting room)

- **Choice:** big sales use a waiting room that admits users at a steady rate.
- **Gain:** the servers are protected from a 130-times traffic spike, and people are served roughly first come, first served instead of the fastest bots or connections winning.
- **Cost:** extra infrastructure to build and run, and users wait in a queue instead of getting straight in.
- **Why we accept it:** without it, we would need far more servers just for ten minutes, and the sale would feel random and unfair.

### 4. Cost vs reliability (scaling for a sale)

- **Choice:** scale out to about 10 app servers before a big sale and scale back down afterwards.
- **Gain:** the sale survives traffic of about 3,300 requests per second, even if one or two servers fail.
- **Cost:** we pay for servers that sit idle outside the sale.
- **Why we accept it:** because we know the sale date in advance, we only pay for the extra capacity for a short time.

### 5. Hold time (10 minutes)

- **Choice:** held seats are locked for 10 minutes.
- **Gain:** buyers have time to enter payment details without losing their seats.
- **Cost:** seats held by people who never pay are unavailable to others for up to 10 minutes.
- **Why we accept it:** a shorter hold (for example, 2 minutes) would sell seats faster but make slow payers fail at the last step, which feels worse than waiting. The hold time is a setting we can tune after watching real behaviour.

### 6. Simplicity vs scalability (monolith and one database)

- **Choice:** one well-organised API application and one primary database with read replicas, with no microservices and no sharding.
- **Gain:** simpler to build, test, deploy and debug, and transactions work across seats, orders and holds without network calls between services.
- **Cost:** a limit on how far a single primary can grow, and every part of the app is deployed together.
- **Why we accept it:** the estimates show about 33 sales per second and under 1 GB of data a year. We split the system later only if numbers prove it is needed.

## Summary

TicketHub stops double-booking with three database layers (an atomic conditional update, a transaction and a unique constraint). It survives the big sale with a waiting room, scaled-out stateless app servers, a short-lived cache and read replicas, while the database stays the one place that decides who owns each seat.