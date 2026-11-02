# Report

## Room schedule query

I generated 100,000 bookings with `generate_series`, then measured the schedule for `room-1` from 1 March 2028 to 8 March 2028. Both queries returned the same 91 rows.

### Before the index

```text
Sort  (cost=3400.46..3411.39 rows=4372 width=51) (actual time=3.700..3.703 rows=91 loops=1)
  Sort Key: start_at
  Sort Method: quicksort  Memory: 32kB
  Buffers: shared hit=1136
  ->  Seq Scan on bookings  (cost=0.00..3136.08 rows=4372 width=51) (actual time=0.873..3.693 rows=91 loops=1)
        Filter: ((start_at < '2028-03-08 00:00:00+00')
                 AND (end_at > '2028-03-01 00:00:00+00')
                 AND (room_id = 'room-1')
                 AND (status = 'confirmed'))
        Rows Removed by Filter: 99913
        Buffers: shared hit=1136
Planning Time: 0.124 ms
Execution Time: 3.713 ms
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
Sort  (cost=1655.81..1666.69 rows=4352 width=51) (actual time=0.797..0.800 rows=91 loops=1)
  Sort Key: start_at
  Sort Method: quicksort  Memory: 32kB
  Buffers: shared hit=255 read=24
  ->  Bitmap Heap Scan on bookings  (cost=145.27..1392.79 rows=4352 width=51) (actual time=0.783..0.790 rows=91 loops=1)
        Recheck Cond: ((room_id = 'room-1')
                       AND (start_at < '2028-03-08 00:00:00+00')
                       AND (status = 'confirmed'))
        Filter: (end_at > '2028-03-01 00:00:00+00')
        Rows Removed by Filter: 5526
        Heap Blocks: exact=255
        Buffers: shared hit=255 read=24
        ->  Bitmap Index Scan on bookings_room_start
              (cost=0.00..144.18 rows=5576 width=0)
              (actual time=0.341..0.341 rows=5617 loops=1)
              Index Cond: ((room_id = 'room-1')
                           AND (start_at < '2028-03-08 00:00:00+00'))
              Buffers: shared read=24
Planning Time: 0.228 ms
Execution Time: 0.813 ms
```

PostgreSQL used `bookings_room_start` and read far fewer pages. On this machine, the query was about 4.6 times faster. Execution times can change between runs, but the plan proves that the index is used.

## PostgreSQL and Valkey

PostgreSQL stores rooms, members, and bookings. It provides reliable storage, foreign keys, transactions, overlap protection, and backups.

Valkey only caches room schedules. The cache key contains the room ID, requested dates, and room version:

```text
room-schedule:<roomId>:v<version>:<from>:<to>
```

Entries expire after 60 seconds. Creating or cancelling a booking changes the room version, so the next schedule request reads current data from PostgreSQL immediately.

If Valkey is unavailable, the API reads from PostgreSQL. Bookings could be stored as JSON in Valkey, but this would remove the relational and durability guarantees they need. The association is small, so PostgreSQL is sufficient as the main storage and Valkey is only useful for temporary cached data.

## Backup and restore

I created a custom-format PostgreSQL backup with `backup.sh` and restored it into a new database named `studio_riff_restore` with `restore.sh`.

| Database | Rooms | Members | Bookings |
| --- | ---: | ---: | ---: |
| `studio_riff` | 4 | 3 | 4 |
| `studio_riff_restore` | 4 | 3 | 4 |

The matching counts prove that the starting data was restored in the new database.

### Recovery objectives

- **RPO: 24 hours.** Daily backups are enough for a small association. At worst, one day of bookings may need to be entered again.
- **RTO: 1 hour.** This leaves time to restart Docker, restore the database, and check the API.
- **Retention: 30 daily backups.** One month is enough time to notice a problem while keeping storage simple.
