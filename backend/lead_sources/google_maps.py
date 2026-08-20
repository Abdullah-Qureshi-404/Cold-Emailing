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

# Pre-defined coordinates for popular metropolitan areas
CITY_COORDINATES = {
    "toronto": ("43.6532", "-79.3832"),
    "vancouver": ("49.2827", "-123.1207"),
    "montreal": ("45.5017", "-73.5673"),
    "calgary": ("51.0447", "-114.0719"),
    "ottawa": ("45.4215", "-75.6972"),
    "new york": ("40.7128", "-74.0060"),
    "london": ("51.5074", "-0.1278"),
    "san francisco": ("37.7749", "-122.4194"),
    "austin": ("30.2672", "-97.7431"),
    "los angeles": ("34.0522", "-118.2437"),
    "chicago": ("41.8781", "-87.6298"),
    "seattle": ("47.6062", "-122.3321"),
    "miami": ("25.7617", "-80.1918"),
    "sydney": ("-33.8688", "151.2093"),
    "berlin": ("52.5200", "13.4050"),
    "paris": ("48.8566", "2.3522"),
}


def _resolve_geo_coordinates(location: str) -> tuple[str, str, int]:
    """
    Resolves latitude, longitude, and map zoom level for a given location string.
    """
    if not location:
        return "43.6532", "-79.3832", 12

    loc_clean = location.strip().lower()
    for city, coords in CITY_COORDINATES.items():
        if city in loc_clean:
            return coords[0], coords[1], 12

    # Geocode dynamically via OpenStreetMap Nominatim
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1},
            headers={"User-Agent": "ColdEmailPlatform/1.0"},
            timeout=3,
        )
        if r.ok:
            results = r.json()
            if results and isinstance(results, list):
                lat = str(results[0].get("lat", "43.6532"))
                lon = str(results[0].get("lon", "-79.3832"))
                return lat, lon, 12
    except Exception as e:
        logger.warning("Geocoding lookup failed for '%s': %s", location, e)

    # Default fallback to Toronto metropolitan area
    return "43.6532", "-79.3832", 12


def _create_job(full_query: str, location: str, campaign_id: int) -> str:
    """
    Submits a new scraping job to the Google Maps scraper service.
    Returns the job_id.
    """
    endpoint = f"{SCRAPER_URL}/api/v1/jobs"
    lat, lon, zoom = _resolve_geo_coordinates(location)

    payload = {
        "name": f"campaign-{campaign_id}-{int(time.time())}",
        "keywords": [full_query],
        "lat": lat,
        "lon": lon,
        "zoom": zoom,
        "depth": 1,
        "max_time": 180,
        "fast_mode": True,
        "lang": "en"
    }

    logger.info("Submitting Google Maps scrape job to %s with payload: %s", endpoint, payload)
    try:
        resp = requests.post(endpoint, json=payload, timeout=15)
        if not resp.ok:
            logger.error("Google Maps scraper error %d: %s", resp.status_code, resp.text)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        err_detail = getattr(e.response, "text", str(e)) if hasattr(e, "response") and e.response is not None else str(e)
        logger.error("Failed to connect to Google Maps scraper at %s: %s (detail: %s)", endpoint, e, err_detail)
        raise RuntimeError(
            f"Google Maps scraper service returned error at {endpoint}: {err_detail}"
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
        job_data = {}
        try:
            resp = requests.get(endpoint, timeout=10)
            if resp.ok and resp.content:
                job_data = resp.json()
        except Exception as e:
            logger.warning("Transient error polling job %s: %s", job_id, e)

        logger.info("Job %s poll response: %s (elapsed: %.1fs)", job_id, job_data, time.time() - start_time)

        # 1. Inspect status/state fields
        status = ""
        if isinstance(job_data, dict):
            status = (
                job_data.get("status")
                or job_data.get("state")
                or (job_data.get("data") or {}).get("status")
                or (job_data.get("data") or {}).get("state")
                or ""
            )
            if job_data.get("done") is True or job_data.get("is_done") is True or (job_data.get("data") or {}).get("done") is True:
                return job_data

        status_str = str(status).lower()
        if status_str in ["completed", "success", "done", "finished", "ok"]:
            return job_data
        elif status_str in ["failed", "error", "cancelled"]:
            err_msg = job_data.get("error") or job_data.get("message") or "Unknown scraper error"
            raise RuntimeError(f"Google Maps scraper job {job_id} failed: {err_msg}")

        # 2. Check if results CSV is ready via download endpoint
        try:
            dl_check = requests.get(f"{SCRAPER_URL}/api/v1/jobs/{job_id}/download", timeout=5)
            if dl_check.ok and len(dl_check.text.strip()) > 0:
                logger.info("Job %s results ready for download (bytes: %d)", job_id, len(dl_check.content))
                return job_data
        except Exception:
            pass

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
    1. Submits the search query with resolved geo coordinates.
    2. Polls for job completion.
    3. Fetches and normalizes business lead rows.
    """
    full_query = f"{query} {location}".strip()
    if not full_query:
        logger.warning("Empty search query provided for Google Maps scraping.")
        return []

    logger.info("Starting Google Maps scrape for campaign %d: '%s' (location='%s')", campaign_id, full_query, location)

    job_id = _create_job(full_query, location, campaign_id)
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