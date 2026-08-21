import time
import requests
from bs4 import BeautifulSoup

# Reuse the same browser-like headers from email_finder.py
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Maximum characters of cleaned text to send to the LLM.
MAX_TEXT_LENGTH = 4000


def extract_company_information(url: str, return_meta: bool = False):
    """
    Fetches a company website homepage, strips HTML noise,
    and returns clean text suitable for LLM consumption.

    If return_meta is True, returns (clean_text, meta_dict).
    If return_meta is False, returns clean_text.
    """
    if not url:
        return (None, None) if return_meta else None

    # Ensure URL has a scheme
    full_url = url if url.startswith(("http://", "https://")) else f"https://{url}"

    meta = {
        "url": full_url,
        "status_code": None,
        "elapsed": 0.0,
        "html": "",
        "error": None
    }

    try:
        start = time.time()
        response = requests.get(full_url, headers=DEFAULT_HEADERS, timeout=10, allow_redirects=True)
        elapsed = time.time() - start

        meta["status_code"] = response.status_code
        meta["elapsed"] = elapsed
        meta["html"] = response.text or ""

        if response.status_code != 200:
            return (None, meta) if return_meta else None

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
            return (None, meta) if return_meta else None

        return (clean_text, meta) if return_meta else clean_text

    except Exception as e:
        meta["error"] = str(e)
        return (None, meta) if return_meta else None
