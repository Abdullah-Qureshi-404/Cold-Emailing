import requests
from bs4 import BeautifulSoup

# Reuse the same browser-like headers from email_finder.py
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Maximum characters of cleaned text to send to the LLM.
# Groq context windows are large, but we keep it reasonable
# to avoid wasting tokens on irrelevant footer/nav text.
MAX_TEXT_LENGTH = 4000


def extract_company_information(url: str) -> str | None:
    """
    Fetches a company website homepage, strips HTML noise,
    and returns clean text suitable for LLM consumption.

    Returns None if the website cannot be reached or has no useful content.
    """
    if not url:
        return None

    # Ensure URL has a scheme
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=10)
        if response.status_code != 200:
            print(f"Company scraper: HTTP {response.status_code} for {url}")
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove elements that add noise and no business value
        for tag in soup(["script", "style", "nav", "footer", "header",
                         "noscript", "svg", "img", "iframe", "form"]):
            tag.decompose()

        # Extract visible text
        raw_text = soup.get_text(separator="\n", strip=True)

        # Collapse excessive whitespace and blank lines
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        # Trim to maximum length so the LLM prompt stays focused
        if len(clean_text) > MAX_TEXT_LENGTH:
            clean_text = clean_text[:MAX_TEXT_LENGTH]

        # If we got almost nothing useful, return None
        if len(clean_text) < 50:
            return None

        return clean_text

    except Exception as e:
        print(f"Company scraper error for {url}: {e}")
        return None
