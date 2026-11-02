# Report

## Room schedule query

I generated 100,000 bookings with `generate_series`, then measured the schedule for `room-1` from 1 March 2028 to 8 March 2028.

The query returned 91 rows.

### Before the index

```text
Sort  (actual time=4.383..4.386 rows=91 loops=1)
  Sort Key: start_at
  Sort Method: quicksort  Memory: 32kB
  Buffers: shared hit=1136
  ->  Seq Scan on bookings  (actual time=1.007..4.375 rows=91 loops=1)
        Filter: start_at < '2028-03-08' AND end_at > '2028-03-01'
                AND room_id = 'room-1' AND status = 'confirmed'
        Rows Removed by Filter: 99913
Planning Time: 0.269 ms
Execution Time: 4.409 ms
```

PostgreSQL read the complete table and removed 99,913 rows.

### Index

```sql
CREATE INDEX bookings_room_start
ON bookings (room_id, start_at)
WHERE status = 'confirmed';
```

### After the index

```text
Sort  (actual time=0.628..0.631 rows=91 loops=1)
  Sort Key: start_at
  Sort Method: quicksort  Memory: 32kB
  Buffers: shared hit=255 read=24
  ->  Bitmap Heap Scan on bookings  (actual time=0.614..0.621 rows=91 loops=1)
        Recheck Cond: room_id = 'room-1' AND start_at < '2028-03-08'
                      AND status = 'confirmed'
        Filter: end_at > '2028-03-01'
        Rows Removed by Filter: 5526
        ->  Bitmap Index Scan on bookings_room_start
              (actual time=0.185..0.185 rows=5617 loops=1)
Planning Time: 0.124 ms
Execution Time: 0.643 ms
```

PostgreSQL used the new index and read far fewer table pages. On this machine, the measured query was about 6.9 times faster. These times can change between runs, but the plan shows that the index is being used.

## PostgreSQL and Valkey

PostgreSQL stores rooms, members, and bookings. It is the source of truth because these records need foreign keys, transactions, overlap protection, backups, and reliable history.

Valkey only stores room schedule responses. A key contains the room ID, the requested dates, and a version number:

```text
room-schedule:<roomId>:v<version>:<from>:<to>
```

Schedule entries live for 60 seconds. This is long enough to avoid repeating popular queries but short enough to remove old unused entries quickly.

Creating or cancelling a booking increments the room version. The next request therefore ignores old cached entries and reads the current schedule from PostgreSQL immediately.

If Valkey is unavailable, cache reads return a miss and the API continues with PostgreSQL.

Bookings could technically be stored as JSON in Valkey, but this would not fit this project. The association is small, and bookings need durable storage, relational checks, transactions, and backup. Valkey is more useful here for temporary derived data.
