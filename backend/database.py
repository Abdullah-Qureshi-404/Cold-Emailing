from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import sys

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print(
        "ERROR: DATABASE_URL is not set.\n"
        "Copy backend/.env.example to backend/.env and set your Postgres connection string.\n"
        "Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/cold_email_db",
        file=sys.stderr,
    )
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "See backend/.env.example for setup instructions."
    )

# Pool sized for concurrent Celery task processing (worker runs with
# --concurrency=16, and research/email-writing tasks each open a pool of
# per-lead threads) — the SQLAlchemy default (5 + 10 overflow) was too small
# and caused "QueuePool limit... connection timed out" errors under load.
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=20, pool_timeout=60)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
