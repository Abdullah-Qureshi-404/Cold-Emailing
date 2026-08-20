import os
import shutil
import subprocess
import logging
from pathlib import Path
from lead_sources.normalizer import load_google_maps_csv

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]


def get_gmaps_output_dir() -> Path:
    """
    Resolves a writable directory for queries.txt and results.csv.
    """
    # 1. Prefer local repo output directory if writable
    local_out = REPO_ROOT / "gmaps-output"
    try:
        local_out.mkdir(parents=True, exist_ok=True)
        return local_out
    except Exception:
        pass

    # 2. Fallback to backend / gmaps-output or /tmp / gmaps-output
    fallback = BACKEND_DIR / "gmaps-output"
    try:
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback
    except Exception:
        tmp_out = Path("/tmp/gmaps-output")
        tmp_out.mkdir(parents=True, exist_ok=True)
        return tmp_out


def scrape_google_maps(query: str, location: str, campaign_id: int) -> list[dict]:
    """
    Runs gosom google-maps-scraper via Docker if available.
    In cloud container environments without Docker daemon access (e.g. Railway),
    raises an explicit RuntimeError explaining the requirement.
    """
    docker_bin = shutil.which("docker")
    if not docker_bin:
        raise RuntimeError(
            "Google Maps scraping requires a Docker daemon or dedicated scraper service, "
            "which is not available in the Railway container environment. "
            "Please use Hacker News search or Pre-Collected Leads import."
        )

    output_dir = get_gmaps_output_dir()
    queries_file = output_dir / "queries.txt"
    results_file = output_dir / "results.csv"

    # Write query to file
    with open(queries_file, "w", encoding="utf-8") as f:
        f.write(f"{query} {location}\n")

    # Remove old results
    if results_file.exists():
        results_file.unlink()

    # Run Docker scraper
    subprocess.run([
        docker_bin, "run",
        "-v", f"{output_dir}:/out",
        "gosom/google-maps-scraper",
        "-input", "/out/queries.txt",
        "-results", "/out/results.csv",
        "-depth", "1",
        "-exit-on-inactivity", "3m"
    ], check=True)

    # Load and normalize results
    if not results_file.exists():
        return []

    return load_google_maps_csv(str(results_file), campaign_id)