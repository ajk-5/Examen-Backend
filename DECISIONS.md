# Design decisions

## Project structure

```text
HTTP routes -> Domain functions -> Database queries -> PostgreSQL
```

- Routes read requests and return HTTP responses.
- Domain functions check the booking rules.
- Database functions read and save data using parameterized SQL.

Valkey will cache room schedules. If the cache is empty or unavailable, the API reads PostgreSQL.

## Business rules

| Rule -----> Where and why |
| ---------- |
| Bookings last 1 to 4 hours and start on a full hour between 10:00 and 23:00 UTC. -----> The domain checks the dates before saving. |
| Bookings for the same room cannot overlap. -----> The domain checks availability. PostgreSQL also blocks overlaps, including when two requests arrive together. One booking can start when another ends. |
| A member can have at most two upcoming bookings. -----> The domain counts future confirmed bookings. We lock the member row while checking and saving in one transaction, so two requests cannot both pass the check. |
| Cancellation keeps the booking. -----> The domain sets `late_cancelled` if less than 24 hours remain, otherwise `cancelled`. Exactly 24 hours is a normal cancellation. |
| A booking cannot be cancelled twice. -----> The domain checks that its status is still `confirmed`. We lock the booking row while checking and updating it. |
| A room cannot be booked during maintenance. -----> The domain checks whether the booking overlaps the room's maintenance dates. |

Cancelled bookings do not block rooms or count toward the two-booking limit.
Functions that depend on time receive a clock as a parameter. This lets tests use a fixed time. All times are UTC.

## Database model

```text
rooms (1) ---- (many) bookings (many) ---- (1) members

rooms
  id, name, capacity, maintenance_start, maintenance_end

members
  id, name

bookings
  id, room_id, member_id, start_at, end_at, status
```

Each table has `id` as its primary key. Each booking links to an existing room and member through foreign keys.
IDs and names use `text`, capacity uses `integer`, and dates use `timestamptz`.
The database checks that end dates come after start dates and that booking status is `confirmed`, `cancelled`, or `late_cancelled`.
To prevent overlaps, we use `btree_gist` and an exclusion constraint on the room and booking time range, only for confirmed bookings. The range uses `[start, end)`: the start is included and the end is excluded, so consecutive bookings are allowed.

##  Use Express and pg

We use Express for the routes and `pg` to run SQL queries.
The project is small, so we do not need an ORM. Writing SQL ourselves makes the queries and database constraints easy to see, but we must write the migrations and map database rows to API responses ourselves.

## Use transactions and database constraints

Domain checks give useful errors, but two requests can pass the same check at the same time.
We use a database constraint to prevent room overlaps and a member row lock to protect the two-booking limit.
The lock, checks, and insert must use the same transaction and connection. If something fails, we roll back. An overlap conflict returns HTTP 409.
