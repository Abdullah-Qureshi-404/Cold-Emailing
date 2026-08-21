import re
import time
import requests

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def assess_website_quality(url: str | None, pre_fetched_meta: dict | None = None) -> tuple[int, list[str]]:
    """
    Cheap heuristic scan of a company's website to flag it as a likely lead
    for "your website needs work" outreach. Returns (score 0-100, issues[]),
    where a LOW score means the site looks outdated/neglected — that's the
    signal we actually want for this ICP (higher score = healthier site).

    Optionally reuses pre_fetched_meta from extract_company_information to save
    an unnecessary second HTTP round-trip.
    """
    issues: list[str] = []

    if not url:
        return 0, ["No website on file"]

    full_url = url if url.startswith(("http://", "https://")) else f"https://{url}"

    if full_url.startswith("http://"):
        issues.append("No HTTPS")

    # Reuse pre-fetched response if available
    if pre_fetched_meta and isinstance(pre_fetched_meta, dict):
        if pre_fetched_meta.get("error"):
            return 5, ["Website unreachable"]

        status_code = pre_fetched_meta.get("status_code")
        if status_code is not None and status_code != 200:
            issues.append(f"Site returned HTTP {status_code}")

        elapsed = pre_fetched_meta.get("elapsed", 0.0)
        html = pre_fetched_meta.get("html") or ""
    else:
        try:
            start = time.time()
            resp = requests.get(full_url, headers=DEFAULT_HEADERS, timeout=10, allow_redirects=True)
            elapsed = time.time() - start
            status_code = resp.status_code
            html = resp.text or ""
            if resp.status_code != 200:
                issues.append(f"Site returned HTTP {resp.status_code}")
        except Exception:
            return 5, ["Website unreachable"]

    if elapsed > 3:
        issues.append("Slow to load (3s+)")

    if "viewport" not in html.lower():
        issues.append("Not mobile-responsive (no viewport meta tag)")

    match = re.search(r"(?:©|copyright)\D{0,10}(20\d{2})", html, re.IGNORECASE)
    if match:
        year = int(match.group(1))
        current_year = time.localtime().tm_year
        if current_year - year >= 3:
            issues.append(f"Stale copyright year ({year})")

    has_analytics = any(tag in html for tag in ("gtag(", "google-analytics", "googletagmanager", "analytics.js"))
    if not has_analytics:
        issues.append("No analytics detected")

    # Score: start at 100, subtract per issue, floor at 5.
    score = max(5, 100 - len(issues) * 18)
    return score, issues
