import logging
import requests

logger = logging.getLogger(__name__)

HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search"

# Intent phrases that signal "I need a developer / website help" — much
# higher-conversion than generic company scraping since these people are
# actively asking for exactly what a freelancer sells.
DEFAULT_QUERIES = [
    "looking for a developer",
    "need help with my website",
    "who wants to work on",
    "looking for a freelancer",
]


def normalize_hackernews_lead(hit: dict, campaign_id: int) -> dict | None:
    title = (hit.get("title") or hit.get("story_title") or "").strip()
    if not title:
        return None
    author = hit.get("author") or "unknown"
    url = hit.get("url") or hit.get("story_url")
    hn_id = hit.get("objectID")

    return {
        "campaign_id": campaign_id,
        "company_name": title[:200],
        "contact_name": author,
        "website": url,
        "phone": None,
        "email": None,
        "source": "hackernews",
        "github_url": None,
        "twitter_url": None,
        "status": "found",
        "raw_data": {
            "author": author,
            "points": hit.get("points"),
            "num_comments": hit.get("num_comments"),
            "hn_url": f"https://news.ycombinator.com/item?id={hn_id}" if hn_id else None,
            "story_text": (hit.get("story_text") or "")[:1000],
        },
    }


def scrape_hackernews(query: str, campaign_id: int, max_results: int = 40) -> list[dict]:
    """
    Searches Hacker News (via the free, keyless Algolia HN API) for posts
    where people are explicitly asking for developer/freelance help — an
    intent signal Google Maps can't provide.
    """
    queries = [query] if query else DEFAULT_QUERIES
    seen_ids = set()
    leads: list[dict] = []

    for q in queries:
        try:
            resp = requests.get(
                HN_SEARCH_URL,
                params={"query": q, "tags": "story", "hitsPerPage": max_results},
                timeout=15,
            )
            resp.raise_for_status()
            hits = resp.json().get("hits", [])
        except Exception as e:
            logger.warning("Hacker News search failed for query '%s': %s", q, e)
            continue

        for hit in hits:
            hn_id = hit.get("objectID")
            if not hn_id or hn_id in seen_ids:
                continue
            seen_ids.add(hn_id)
            lead = normalize_hackernews_lead(hit, campaign_id)
            if lead:
                leads.append(lead)

    return leads
