CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    maintenance_start TIMESTAMPTZ,
    maintenance_end TIMESTAMPTZ,
    CHECK (
        (maintenance_start IS NULL AND maintenance_end IS NULL)
        OR
        (maintenance_start IS NOT NULL AND maintenance_end IS NOT NULL AND maintenance_start < maintenance_end)
    )
);

CREATE TABLE members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    member_id TEXT NOT NULL REFERENCES members(id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'late_cancelled')),
    CHECK (start_at < end_at)
);

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status = 'confirmed');
