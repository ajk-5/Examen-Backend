# Report

## Room schedule query

Generated 100,000 bookings with `generate_series`, then measured the schedule for `room-1` from 1 March 2028 to 8 March 2028. The query returned 91 rows.

### Before the index

```text
 Sort  (cost=3400.52..3411.46 rows=4373 width=51) (actual time=6.533..6.537 rows=91 loops=1)
   Sort Key: start_at
   Sort Method: quicksort  Memory: 32kB
   Buffers: shared hit=1136
   ->  Seq Scan on bookings  (cost=0.00..3136.08 rows=4373 width=51) (actual time=1.964..6.518 rows=91 loops=1)
         Filter: ((start_at < '2028-03-08 00:00:00+00'::timestamp with time zone) AND (end_at > '2028-03-01 00:00:00+00'::timestamp with time zone) AND (room_id = 'room-1'::text) AND (status = 'confirmed'::text))
         Rows Removed by Filter: 99913
:
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
Sort  (cost=21.21..21.32 rows=44 width=51) (actual time=0.102..0.103 rows=0 loops=1)
   Sort Key: start_at
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=5 dirtied=1
   ->  Bitmap Heap Scan on bookings  (cost=4.87..20.01 rows=44 width=51) (actual time=0.038..0.039 ro
ws=0 loops=1)
         Recheck Cond: ((room_id = 'room-1'::text) AND (status = 'confirmed'::text))
         Filter: ((start_at < '2028-03-08 00:00:00+00'::timestamp with time zone) AND (end_at > '2028-03-01 00:00:00+00'::timestamp with time zone))
         Rows Removed by Filter: 1
         Heap Blocks: exact=1
         Buffers: shared hit=2 dirtied=1
         ->  Bitmap Index Scan on bookings_no_overlap  (cost=0.00..4.86 rows=257 width=0) (actual tim
e=0.027..0.027 rows=1 loops=1)
               Index Cond: (room_id = 'room-1'::text)
               Buffers: shared hit=1
 Planning:
            Buffers: shared hit=136 dirtied=1
            Planning Time: 0.590 ms
            Execution Time: 0.792 ms
```


## PostgreSQL and Valkey
PostgreSQL stores rooms, members, and bookings, ensuring data integrity, transactions, and backups.

Valkey caches room schedules using the room ID, requested dates, and version number as the cache key

```text
room-schedule:<roomId>:v<version>:<from>:<to>
```

Schedule cache entries expire after 60 seconds. Creating or cancelling a booking updates the room version, so the next request gets fresh data from PostgreSQL.
If Valkey is unavailable, the API uses PostgreSQL directly.
Bookings stay in PostgreSQL for reliable storage, transactions, and backups. Valkey is only used for temporary cached data.

## Backup and restore

Created a custom-format PostgreSQL backup with `backup.sh` and restored it into a new database named `studio_riff_restore` with `restore.sh`.

The row counts after restoration were:

| Database | Rooms | Members | Bookings |
| --- | ---: | ---: | ---: |
| `studio_riff` | 4 | 3 | 4 |
| `studio_riff_restore` | 4 | 3 | 4 |

The matching counts prove that the starting data was restored in the new database.

### Recovery objectives

RPO: 24 hours. Daily backups are enough for a small association. At worst, one day of bookings may be lost.

RTO: 2 hours. Enough time to restart Docker, restore the database, and check the API.



