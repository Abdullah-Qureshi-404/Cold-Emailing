# Cold Email Platform

FastAPI + Celery + Postgres + Redis backend, React (Vite) frontend.

## Quick start (Docker)

```
cp backend/.env.example backend/.env      # fill in GROQ_API_KEY, GMAIL_* etc.
cp frontend/.env.example frontend/.env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Postgres: localhost:5432 (user `postgres`, db `cold_email_db`)
- Redis: localhost:6379

`docker compose up` runs `alembic upgrade head` automatically before starting
the API, so the schema is always current.

### If you already have local data in an existing Postgres instance

The `postgres` service in `docker-compose.yml` starts with its own empty
volume — it does **not** see data sitting in a Postgres you already run on
your host. Pick one:

- **Keep using your existing Postgres**: don't rely on the compose `postgres`
  service; instead point `backend/.env`'s `DATABASE_URL` at your host database
  (e.g. `postgresql://postgres:<pw>@host.docker.internal:5432/cold_email_db`
  on Windows/Mac) and remove the `DATABASE_URL` override in
  `docker-compose.yml`'s `backend`/`celery-worker` services so your `.env`
  value is used instead.
- **Migrate your data into the compose volume**: `pg_dump` your existing
  database and `pg_restore`/`psql` it into the `postgres` container once it's
  up.

## Local dev (no Docker)

Backend:
```
cd backend
python -m venv venv && venv/Scripts/activate   # or source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL, REDIS_URL, API keys
alembic upgrade head
python run_dev.py       # starts FastAPI + Celery worker (+ redis-server if found on PATH)
```

Frontend:
```
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Known limitations

- **Google Maps scraping** (`lead_sources/google_maps.py`) shells out to
  `docker run gosom/google-maps-scraper`. This works when the backend runs
  directly on a host with Docker installed. When the backend itself runs
  *inside* the `docker-compose` `backend`/`celery-worker` containers, this
  nested `docker run` is **not** wired up (would need the host Docker socket
  mounted in, plus matching host-path volumes) and the scrape task will fail.
  The **CSV import** path (Free Outbound Agent leads) works fine either way.
  If you need containerized Google Maps scraping, mount
  `/var/run/docker.sock` into the `backend`/`celery-worker` services and
  ensure `gmaps-output`/`free_outbound_agent` paths match between host and
  container.
