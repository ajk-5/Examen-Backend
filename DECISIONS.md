# Design decisions

## Architecture

```text
Routes -> Controllers -> Services -> Repositories -> PostgreSQL
                              |
                              v
                            Domain
```

- Routes define the URLs.
- Controllers validate HTTP input and return responses.
- Services coordinate each use case and choose the correct error.
- Domain functions contain the booking and cancellation rules.
- Repositories contain parameterized SQL and database transactions.

Dependencies are created in `app.ts` and passed through constructors. The services depend on small repository interfaces instead of PostgreSQL classes directly.

The room schedule cache will be added with Valkey in step 6. PostgreSQL will remain the source of truth and the fallback when Valkey is unavailable.

## Business rules

| Rule | Implementation |
| --- | --- |
| A booking lasts 1 to 4 hours and starts on a full hour between 10:00 and 23:00 UTC. | `bookingRules.ts` validates the start and end dates before the service saves a booking. |
| Confirmed bookings for one room cannot overlap. Consecutive bookings are allowed. | The domain checks availability for a clear 409 response. PostgreSQL also has an exclusion constraint, which protects concurrent requests. It uses a `[start, end)` range so a booking can start when another ends. |
| A member can have at most two upcoming bookings. | Booking creation locks the member row, counts future confirmed bookings, and inserts in one transaction. The domain contains the limit and its error message. |
| Cancellation keeps the booking. | `cancellationRules.ts` returns `late_cancelled` when less than 24 hours remain, otherwise `cancelled`. Exactly 24 hours is a normal cancellation. |
| A booking cannot be cancelled twice. | Cancellation locks the booking row and only updates a booking whose status is `confirmed`. A second request returns 409. |
| Maintenance blocks overlapping bookings. | `bookingRules.ts` compares the requested dates with the room maintenance dates before creation. Touching the start or end without overlap is allowed. |

All time comparisons use UTC. Services receive a `Clock`, which allows tests to use a fixed date instead of the system clock.

Controllers do not contain business rules. Known validation, missing-resource, and conflict errors are converted to 400, 404, and 409 responses by the central error handler. Unexpected errors return 500.

## Relational model

```text
rooms (1) ---- (many) bookings (many) ---- (1) members

rooms
  id, name, capacity, maintenance_start, maintenance_end

members
  id, name

bookings
  id, room_id, member_id, start_at, end_at, status
```

Each table uses a text ID as its primary key. A booking has foreign keys to one room and one member. Dates use `timestamptz`.

The database checks that capacities are positive, maintenance dates are valid, booking end dates are after start dates, and statuses are `confirmed`, `cancelled`, or `late_cancelled`.

The migration enables `btree_gist`. A partial exclusion constraint combines room equality with the booking time range and applies only to confirmed bookings.

## ADR 1: Express and direct SQL

**Decision:** Use Express for HTTP and `pg` for PostgreSQL without an ORM.

**Reason:** The API is small. Parameterized SQL keeps queries, row locks, transactions, and PostgreSQL constraints visible and easy to explain.

**Consequence:** Migrations and row mapping are written manually, but there is no extra ORM configuration or abstraction.

## ADR 2: Domain checks and database protection

**Decision:** Keep readable rules in the domain and use database transactions and constraints for concurrency.

**Reason:** Two requests can pass the same availability or member-limit check at the same time. Domain checks alone cannot protect shared data.

**Consequence:** Booking creation locks the member row, cancellation locks the booking row, and the exclusion constraint prevents room overlaps. A failed transaction is rolled back and returned as the correct HTTP error.
