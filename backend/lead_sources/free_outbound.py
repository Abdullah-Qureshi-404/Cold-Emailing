import os
import logging
from pathlib import Path
from lead_sources.normalizer import load_free_outbound_csv

logger = logging.getLogger(__name__)

# backend/lead_sources/free_outbound.py -> backend/lead_sources -> backend
BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]


def resolve_free_outbound_csv_path(filepath: str | Path | None = None) -> Path | None:
    """
    Resolves the Free Outbound Agent leads CSV path across various runtime environments:
    1. Explicit path parameter if provided and exists.
    2. FREE_OUTBOUND_CSV_PATH environment variable if set and exists.
    3. Packaged production path inside backend: backend/data/leads.csv (/app/data/leads.csv).
    4. Local development repo path: free_outbound_agent/leads.csv.
    5. Docker Compose mounted root path: /free_outbound_agent/leads.csv.
    """
    candidates = []

    if filepath:
        candidates.append(Path(filepath).resolve())

    env_path = os.getenv("FREE_OUTBOUND_CSV_PATH")
    if env_path:
        candidates.append(Path(env_path).resolve())

    # Packaged in container / backend
    candidates.append(BACKEND_DIR / "data" / "leads.csv")
    # Repo root development fallback
    candidates.append(REPO_ROOT / "free_outbound_agent" / "leads.csv")
    # Docker Compose mounted volume fallback
    candidates.append(Path("/free_outbound_agent/leads.csv"))

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            logger.info("Resolved Free Outbound CSV path to: %s", candidate)
            return candidate

    logger.warning("Free Outbound CSV not found among candidates: %s", candidates)
    return None


def import_free_outbound_leads(filepath: str | Path | None, campaign_id: int) -> list[dict]:
    """
    Reads a Free Outbound Agent CSV file and returns normalized leads.
    """
    resolved_path = resolve_free_outbound_csv_path(filepath)
    if not resolved_path or not resolved_path.exists():
        raise FileNotFoundError(f"Free Outbound CSV file not found: {filepath}")

    return load_free_outbound_csv(str(resolved_path), campaign_id)
