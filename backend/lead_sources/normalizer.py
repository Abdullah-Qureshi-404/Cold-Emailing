import csv
import json


def normalize_google_maps_lead(row: dict, campaign_id: int) -> dict:
    """
    Takes a raw row from gosom google-maps-scraper CSV
    and converts to our standard Lead format dictionary.
    """
    company_name = row.get("title", "").strip() or "Unknown Company"
    website = row.get("website", "").strip() or None
    phone = row.get("phone", "").strip() or None
    email = None  # Email finder will handle this later

    return {
        "campaign_id": campaign_id,
        "company_name": company_name,
        "contact_name": None,
        "website": website,
        "phone": phone,
        "email": email,
        "source": "google_maps",
        "github_url": None,
        "twitter_url": None,
        "status": "found",
        "raw_data": {
            "address": row.get("address", ""),
            "category": row.get("category", ""),
            "rating": row.get("review_rating", ""),
            "review_count": row.get("review_count", ""),
            "link": row.get("link", "")
        }
    }


def load_google_maps_csv(filepath: str, campaign_id: int) -> list[dict]:
    """
    Reads results.csv from gosom scraper
    Returns list of normalized leads.
    """
    leads = []

    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        seen = set()  # avoid duplicates

        for row in reader:
            website = row.get("website", "").strip()
            company_name = row.get("title", "").strip()

            if not company_name:
                continue

            # Skip duplicates based on website or company name
            key = website or company_name
            if key in seen:
                continue
            seen.add(key)

            lead = normalize_google_maps_lead(row, campaign_id)
            leads.append(lead)

    return leads


def normalize_free_outbound_lead(row: dict, campaign_id: int) -> dict:
    """
    Takes a raw row from Free Outbound Agent CSV
    and converts to our standard Lead format dictionary.
    """
    company = row.get("Company", "").strip()
    name = row.get("Name", "").strip()

    # Use Company name if available; fall back to Contact Name or default
    company_name = company if company else (name if name else "Unknown Company")
    contact_name = name if name else None

    website = row.get("Website", "").strip() or None
    email = row.get("Email", "").strip() or None
    phone = None

    # Clean social handles/URLs
    twitter = row.get("Twitter", "").strip()
    twitter_url = f"https://twitter.com/{twitter.lstrip('@')}" if twitter else None

    profile = row.get("Profile", "").strip()
    github_url = profile if "github.com" in profile.lower() else None

    # If email is pre-populated, status is EMAIL_FOUND; otherwise FOUND
    status = "email_found" if email else "found"

    return {
        "campaign_id": campaign_id,
        "company_name": company_name,
        "contact_name": contact_name,
        "website": website,
        "phone": phone,
        "email": email,
        "source": f"free_outbound:{row.get('Source', 'csv')}",
        "github_url": github_url,
        "twitter_url": twitter_url,
        "status": status,
        "raw_data": {
            "username": row.get("Username", ""),
            "bio": row.get("Bio", ""),
            "followers": row.get("Followers", ""),
            "original_source": row.get("Source", ""),
            "profile": profile
        }
    }


def load_free_outbound_csv(filepath: str, campaign_id: int) -> list[dict]:
    """
    Reads CSV export from free_outbound_agent
    Returns list of normalized leads.
    """
    leads = []

    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        seen = set()

        for row in reader:
            email = row.get("Email", "").strip()
            website = row.get("Website", "").strip()
            name = row.get("Name", "").strip()
            company = row.get("Company", "").strip()

            if not company and not name and not email:
                continue

            # Deduplicate by email, website, or company/name key
            key = email or website or f"{company}_{name}"
            if key in seen:
                continue
            seen.add(key)

            lead = normalize_free_outbound_lead(row, campaign_id)
            leads.append(lead)

    return leads