# Studio Riff API

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
```

Insert the starting data:

```powershell
Get-Content -Raw -Encoding utf8 seeds/seed.sql | docker compose exec -T postgres psql -U studio -d studio_riff -v ON_ERROR_STOP=1
```

The seed script clears the existing tables before inserting the exam data.

## API

Build and start the API:

```powershell
npm run build
npm start
```

The API runs at `http://localhost:3000`.

The implemented route is:

```text
GET /rooms
```

Stop the databases with:

```powershell
docker compose down
```

