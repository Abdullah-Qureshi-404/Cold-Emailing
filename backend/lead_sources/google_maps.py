import io
import csv
import os
import time
import logging
import requests
from lead_sources.normalizer import normalize_google_maps_lead

logger = logging.getLogger(__name__)

# Default scraper URL: configured via Railway private networking or local dev
SCRAPER_URL = os.getenv("GOOGLE_MAPS_SCRAPER_URL", "http://google-maps-scraper.railway.internal:8080").rstrip("/")
POLL_INTERVAL_SECONDS = 3
MAX_POLL_DURATION_SECONDS = 180  # 3 minutes


def _create_job(full_query: str, campaign_id: int) -> str:
    """
    Submits a new scraping job to the Google Maps scraper service.
    Returns the job_id.
    """
    endpoint = f"{SCRAPER_URL}/api/v1/jobs"
    payload = {
        "name": f"campaign-{campaign_id}-{int(time.time())}",
        "keywords": [full_query],
        "depth": 1,
        "fast_mode": True,
        "lang": "en"
    }

    logger.info("Submitting Google Maps scrape job to %s with payload: %s", endpoint, payload)
    try:
        resp = requests.post(endpoint, json=payload, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error("Failed to connect to Google Maps scraper at %s: %s", endpoint, e)
        raise RuntimeError(
            f"Unable to communicate with Google Maps scraper service at {SCRAPER_URL}. "
            "Ensure the scraper service is running."
        ) from e

    data = resp.json() if resp.content else {}
    job_id = data.get("id") or data.get("job_id") or (data.get("data") or {}).get("id")
    if not job_id:
        # Some versions return raw ID as string or integer
        if isinstance(data, (str, int)):
            job_id = str(data)
        else:
            raise RuntimeError(f"Unexpected response format from scraper when creating job: {data}")

    logger.info("Google Maps scrape job created with ID: %s", job_id)
    return str(job_id)


def _poll_job_completion(job_id: str) -> dict:
    """
    Polls the scraper service until the job is completed or fails.
    """
    endpoint = f"{SCRAPER_URL}/api/v1/jobs/{job_id}"
    start_time = time.time()

    while time.time() - start_time < MAX_POLL_DURATION_SECONDS:
        try:
            resp = requests.get(endpoint, timeout=10)
            resp.raise_for_status()
            job_data = resp.json() if resp.content else {}
        except requests.exceptions.RequestException as e:
            logger.warning("Transient error polling job %s: %s", job_id, e)
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        status = (
            job_data.get("status")
            or job_data.get("state")
            or (job_data.get("data") or {}).get("status")
            or ""
        ).lower()

        logger.info("Job %s status: %s (elapsed: %.1fs)", job_id, status, time.time() - start_time)

        if status in ["completed", "success", "done", "finished"]:
            return job_data
        elif status in ["failed", "error", "cancelled"]:
            err_msg = job_data.get("error") or job_data.get("message") or "Unknown scraper error"
            raise RuntimeError(f"Google Maps scraper job {job_id} failed: {err_msg}")

        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(
        f"Google Maps scraping job {job_id} timed out after {MAX_POLL_DURATION_SECONDS} seconds."
    )


def _fetch_job_results(job_id: str) -> list[dict]:
    """
    Downloads CSV or JSON results for the completed job.
    """
    download_url = f"{SCRAPER_URL}/api/v1/jobs/{job_id}/download"
    logger.info("Downloading Google Maps scrape results from %s", download_url)

    try:
        resp = requests.get(download_url, timeout=30)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error("Failed to download results for job %s from %s: %s", job_id, download_url, e)
        raise RuntimeError(f"Failed to download Google Maps results for job {job_id}: {e}") from e

    content_type = resp.headers.get("Content-Type", "")
    text = resp.text

    # Parse CSV format
    if "json" not in content_type and ("," in text or "\n" in text):
        f = io.StringIO(text)
        reader = csv.DictReader(f)
        return list(reader)

    # Parse JSON format if returned
    try:
        data = resp.json()
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return data.get("data") or data.get("results") or data.get("items") or []
    except Exception:
        pass

    # Fallback to CSV parsing of text
    f = io.StringIO(text)
    reader = csv.DictReader(f)
    return list(reader)


def scrape_google_maps(query: str, location: str, campaign_id: int) -> list[dict]:
    """
    Orchestrates Google Maps scraping through the standalone scraper service:
    1. Submits the search query.
    2. Polls for job completion.
    3. Fetches and normalizes business lead rows.
    """
    full_query = f"{query} {location}".strip()
    if not full_query:
        logger.warning("Empty search query provided for Google Maps scraping.")
        return []

    logger.info("Starting Google Maps scrape for campaign %d: '%s'", campaign_id, full_query)

    job_id = _create_job(full_query, campaign_id)
    _poll_job_completion(job_id)
    raw_rows = _fetch_job_results(job_id)

    logger.info("Fetched %d raw business records from scraper for job %s", len(raw_rows), job_id)

    leads = []
    seen = set()

    for row in raw_rows:
        lead = normalize_google_maps_lead(row, campaign_id)
        key = lead.get("website") or lead.get("company_name")
        if not key or key in seen:
            continue
        seen.add(key)
        leads.append(lead)

    logger.info("Normalized %d unique Google Maps leads for campaign %d", len(leads), campaign_id)
    return leads