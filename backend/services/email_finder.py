import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Standard email regex pattern
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'

# Common non-person / placeholder domains and file extensions to ignore
IGNORED_DOMAINS = {"example.com", "domain.com", "sentry.io", "w3.org", "schema.org", "github.com", "twitter.com", "facebook.com"}
IGNORED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf", ".css", ".js"}

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def _extract_emails_from_text(text: str) -> list[str]:
    """
    Finds all potential email addresses in raw text using Regex
    and filters out false positives, images, and placeholder domains.
    """
    matches = re.findall(EMAIL_REGEX, text)
    valid_emails = []

    for email in matches:
        email_clean = email.lower().strip()

        # Skip if email ends with asset extension
        if any(email_clean.endswith(ext) for ext in IGNORED_EXTENSIONS):
            continue

        # Skip if domain is in ignored list
        domain = email_clean.split("@")[-1]
        if domain in IGNORED_DOMAINS:
            continue

        if email_clean not in valid_emails:
            valid_emails.append(email_clean)

    return valid_emails


def find_email_from_website(website_url: str) -> str | None:
    """
    Scrapes a target website homepage (and /contact or /about pages if needed)
    to find contact email addresses. Returns the first valid email or None.
    """
    if not website_url:
        return None

    # Ensure URL includes scheme
    if not website_url.startswith(("http://", "https://")):
        url = f"https://{website_url}"
    else:
        url = website_url

    try:
        # Fetch home page with timeout
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=7)
        if response.status_code != 200:
            return None

        # 1. Search raw page content and mailto links
        emails = _extract_emails_from_text(response.text)
        if emails:
            return emails[0]

        # 2. Check for contact or about links on homepage
        soup = BeautifulSoup(response.text, "html.parser")
        for link in soup.find_all("a", href=True):
            href = link["href"].lower()
            if "contact" in href or "about" in href:
                sub_url = urljoin(url, link["href"])
                try:
                    sub_res = requests.get(sub_url, headers=DEFAULT_HEADERS, timeout=5)
                    sub_emails = _extract_emails_from_text(sub_res.text)
                    if sub_emails:
                        return sub_emails[0]
                except Exception:
                    continue

    except Exception as e:
        print(f"Error scraping website {website_url}: {e}")

    return None
