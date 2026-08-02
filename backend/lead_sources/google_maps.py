import subprocess
import os
from pathlib import Path
from lead_sources.normalizer import load_google_maps_csv

# backend/lead_sources/google_maps.py -> backend/lead_sources -> backend -> repo root
REPO_ROOT = Path(__file__).resolve().parents[2]


def scrape_google_maps(query: str, location: str, campaign_id: int) -> list[dict]:
    """
    Runs gosom google-maps-scraper via Docker
    Returns list of normalized leads
    """
    output_dir = str(REPO_ROOT / "gmaps-output")
    queries_file = os.path.join(output_dir, "queries.txt")
    results_file = os.path.join(output_dir, "results.csv")

    # Write query to file
    with open(queries_file, "w") as f:
        f.write(f"{query} {location}\n")

    # Remove old results
    if os.path.exists(results_file):
        os.remove(results_file)

    # Run Docker scraper
    subprocess.run([
        "docker", "run",
        "-v", f"{output_dir}:/out",
        "gosom/google-maps-scraper",
        "-input", "/out/queries.txt",
        "-results", "/out/results.csv",
        "-depth", "1",
        "-exit-on-inactivity", "3m"
    ], check=True)

    # Load and normalize results
    if not os.path.exists(results_file):
        return []

    return load_google_maps_csv(results_file, campaign_id) 