# Design 

## Layers

```text
Routes -> Controllers -> Services -> Repositories -> PostgreSQL
                              |
                              +-> Domain
                              +-> Schedule cache -> Valkey
```

- Routes define the URLs.
- Controllers read requests and return responses.
- Services organize the work for each route.
- Domain files contain the business rules.
- Repositories contain SQL queries and transactions.

The classes are connected in app.ts. Services use repository interfaces, which also makes them easier to test.
Valkey stores room schedule responses for 60 seconds. PostgreSQL stays the main database and is used if Valkey is unavailable.

## Business rules

| Rule ---> Where handled |
| ------ |
| A booking lasts 1 to 4 hours and starts on a full hour between 10:00 and 23:00 UTC. ---> The domain checks the dates before saving. |
| Two confirmed bookings in the same room cannot overlap. ---> The domain checks availability. PostgreSQL also has an exclusion constraint for requests that arrive at the same time. The end is excluded, so consecutive bookings are allowed. |
| A member can have at most two upcoming bookings. ---> Creation locks the member row, counts future confirmed bookings, and inserts in one transaction. |
| A cancellation keeps the booking. ---> The domain sets late_cancelled when less than 24 hours remain. Otherwise it sets cancelled. |
| A booking cannot be cancelled twice. ---> Cancellation locks the booking row and only changes a confirmed booking. |
| Maintenance blocks an overlapping booking. ---> The domain compares the booking dates with the room maintenance dates. |

All dates use UTC. Code that needs the current time receives a clock, so tests can use a fixed date.

The error handler returns 400 for invalid input, 404 for missing data, 409 for conflicts, and 500 for unexpected errors.

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

Each table has a text primary key. Bookings have foreign keys to rooms and members. Dates use `timestamptz`.
The database checks capacities, date order, maintenance dates, and booking statuses. The `btree_gist` extension and an exclusion constraint prevent overlapping confirmed bookings.

## Decision 1: Express and pg

We use Express for the API and pg for PostgreSQL. The project is small, so an ORM would add more code than needed. Direct SQL also makes the transactions and constraints easy to see.

## Decision 2: Domain checks and database protection

The domain checks rules to return clear errors. PostgreSQL transactions and constraints protect the data when requests arrive together.
Booking creation locks the member row. Cancellation locks the booking row. The exclusion constraint prevents room overlaps.
