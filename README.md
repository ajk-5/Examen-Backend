
## Setup

Install the dependencies:
```powershell
npm install
```

Create the local environment file, then replace `change-me` with a password:
```powershell
Copy-Item .env.example .env
```

Start PostgreSQL and Valkey:
```powershell
docker compose up -d --wait
```

## Database

Apply the migration:
```powershell
Get-Content -Raw migrations/001_initial.sql | docker compose exec -T postgres psql -U studio -d studio_riff -v ON_ERROR_STOP=1
Get-Content -Raw migrations/002_booking_schedule_index.sql | docker compose exec -T postgres psql -U studio -d studio_riff -v ON_ERROR_STOP=1
```

Insert the starting data:
```powershell
Get-Content -Raw -Encoding utf8 seeds/seed.sql | docker compose exec -T postgres psql -U studio -d studio_riff -v ON_ERROR_STOP=1
```

## API

Build and start the API:

```powershell
npm run build
npm start
```

The API runs at `http://localhost:3000`.

## Cache

Room schedules are cached in Valkey for 60 seconds. Creating or cancelling a booking invalidates the room cache immediately. If Valkey is unavailable, the API reads from PostgreSQL.

## Tests

Run the tests with:

```powershell
npm test
```

The tests reset the database to the starting data.

## Backup and restore

Create a backup:

```powershell
bash backup.sh
```

Restore it into a separate database:

```powershell
bash restore.sh backups/studio_riff.dump studio_riff_restore
```

The implemented routes are:
```text
GET /rooms
GET /rooms/:id/bookings?from=...&to=...
POST /rooms/:id/bookings
GET /bookings/:id
DELETE /bookings/:id
GET /members/:id/bookings
```

Stop the containers with:

```powershell
docker compose down
```

