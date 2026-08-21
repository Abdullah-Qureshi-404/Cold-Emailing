import json
import logging
import random
import time
import threading
import requests

from config import (
    GROQ_API_KEY,
    GROQ_API_URL,
    GROQ_MODEL,
    GROQ_MAX_RETRIES,
    GROQ_INITIAL_RETRY_DELAY,
    GROQ_MAX_RETRY_DELAY,
    GROQ_MAX_CONCURRENT_REQUESTS
)

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

# Thread-safe rate limiter to strictly adhere to Groq's Tokens/Requests Per Minute limits
_groq_semaphore = threading.Semaphore(GROQ_MAX_CONCURRENT_REQUESTS)
_rate_limit_lock = threading.Lock()
_last_request_time = 0.0
_MIN_REQUEST_INTERVAL = 0.8  # seconds between consecutive requests across all threads


def _make_groq_request(messages: list[dict], temperature: float = 0.3, max_tokens: int = 1024) -> str | None:
    """
    Central helper to invoke Groq OpenAI-compatible chat completion API with
    semaphore-bounded concurrency, exponential backoff + jitter, and Retry-After support.

    Retries strictly for retryable HTTP status codes (429, 500, 502, 503, 504).
    Does NOT retry authentication (401) or bad request (400) errors.
    Returns the string content of the model's message or None on failure.
    """
    global _last_request_time

    if not GROQ_API_KEY:
        logger.error("Groq API error: GROQ_API_KEY is not set in environment")
        return None

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    with _groq_semaphore:
        for attempt in range(1, GROQ_MAX_RETRIES + 1):
            # Enforce inter-request spacing to avoid burst 429s
            with _rate_limit_lock:
                now = time.time()
                elapsed = now - _last_request_time
                if elapsed < _MIN_REQUEST_INTERVAL:
                    time.sleep(_MIN_REQUEST_INTERVAL - elapsed)
                _last_request_time = time.time()

            try:
                response = requests.post(
                    GROQ_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    return content

                if response.status_code in RETRYABLE_STATUS_CODES:
                    retry_after = response.headers.get("Retry-After")
                    wait_seconds = None

                    if retry_after:
                        try:
                            wait_seconds = float(retry_after)
                            logger.info("Groq API returned Retry-After header: %.1fs", wait_seconds)
                        except ValueError:
                            wait_seconds = None

                    if wait_seconds is None:
                        # Exponential backoff with random jitter to prevent synchronized retries
                        calculated = GROQ_INITIAL_RETRY_DELAY * (2 ** (attempt - 1))
                        jitter = random.uniform(0.5, 2.0)
                        wait_seconds = min(GROQ_MAX_RETRY_DELAY, calculated + jitter)

                    logger.warning(
                        "Groq API HTTP %d (attempt %d/%d). Backing off for %.2fs...",
                        response.status_code,
                        attempt,
                        GROQ_MAX_RETRIES,
                        wait_seconds
                    )

                    if attempt < GROQ_MAX_RETRIES:
                        time.sleep(wait_seconds)
                        continue
                    else:
                        logger.error(
                            "Groq API max retries (%d) exhausted. Last HTTP status: %d - %s",
                            GROQ_MAX_RETRIES,
                            response.status_code,
                            response.text[:200]
                        )
                        return None
                else:
                    logger.error(
                        "Groq API non-retryable HTTP error %d: %s",
                        response.status_code,
                        response.text[:200]
                    )
                    return None

            except requests.RequestException as e:
                logger.warning(
                    "Groq API network error (attempt %d/%d): %s",
                    attempt,
                    GROQ_MAX_RETRIES,
                    e
                )
                if attempt < GROQ_MAX_RETRIES:
                    calculated = GROQ_INITIAL_RETRY_DELAY * (2 ** (attempt - 1))
                    jitter = random.uniform(0.5, 1.5)
                    wait_seconds = min(GROQ_MAX_RETRY_DELAY, calculated + jitter)
                    time.sleep(wait_seconds)
                    continue
                else:
                    logger.error("Groq API request failed after %d network retries: %s", GROQ_MAX_RETRIES, e)
                    return None

    return None


def _extract_json_payload(content: str | None) -> dict | None:
    """
    Robustly extracts and parses JSON dictionary from LLM response text,
    handling markdown fences (```json ... ```), leading/trailing text, and unicode.
    """
    if not content:
        return None

    raw = content.strip()

    # 1. Try direct parsing
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # 2. Extract from markdown code blocks
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            block = part.strip()
            if block.startswith("json"):
                block = block[4:].strip()
            if block.startswith("{") and block.endswith("}"):
                try:
                    data = json.loads(block)
                    if isinstance(data, dict):
                        return data
                except json.JSONDecodeError:
                    pass

    # 3. Find outermost matching curly braces { ... }
    start_idx = raw.find("{")
    end_idx = raw.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        candidate = raw[start_idx:end_idx + 1].strip()
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass

    return None


def generate_company_research(company_name: str, company_text: str) -> dict | None:
    """
    Sends cleaned company website text to Groq LLM and asks it
    to produce structured research useful for writing cold emails.

    Returns a validated dict with keys:
        company_summary, business_model, technologies,
        possible_pain_points, personalization_angles

    Returns None if the API call fails or the response is not valid JSON.
    """
    system_prompt = (
        "You are a business research analyst. "
        "Given website content from a company, produce a structured JSON research report. "
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "company_summary": "2-3 sentence summary of what the company does",\n'
        '  "business_model": "How the company makes money",\n'
        '  "technologies": ["list", "of", "technologies", "they", "use", "or", "sell"],\n'
        '  "possible_pain_points": ["business", "challenges", "they", "might", "face"],\n'
        '  "personalization_angles": ["specific", "angles", "for", "a", "cold", "email"],\n'
        '  "estimated_team_size": "one of: solo, small, medium, large",\n'
        '  "icp_fit_score": "0-100 integer: how well this fits a SOLO/FREELANCE developer'
        ' selling cheap web/dev services to small teams (large, well-funded, or enterprise'
        ' companies score LOW; solo founders, freelancers, and small 2-10 person teams score HIGH)"\n'
        "}"
    )

    user_prompt = (
        f"Company name: {company_name}\n\n"
        f"Website content:\n{company_text}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    content = _make_groq_request(messages=messages, temperature=0.3, max_tokens=1024)
    if not content:
        return None

    research = _extract_json_payload(content)
    if not research:
        logger.error("Groq service: failed to parse JSON from research response: %s", content[:200])
        return None

    required_keys = [
        "company_summary",
        "business_model",
        "technologies",
        "possible_pain_points",
        "personalization_angles"
    ]
    for key in required_keys:
        if key not in research:
            logger.warning("Groq research response missing required key '%s'", key)
            return None

    return research


def generate_campaign_plan(prompt: str) -> dict | None:
    """
    Turns a description of a target niche/audience into structured campaign setup fields.
    The sender is a software developer offering technical services (software engineering,
    AI integrations, automations, web/mobile apps, APIs, maintenance).
    For each campaign, 1-3 relevant technical services are selected based on the target audience.
    """
    system_prompt = (
        "You are an expert B2B outreach strategist for a software developer.\n"
        "Sender Profile: A skilled software developer offering software engineering, AI integration, "
        "automation, web/mobile apps, custom APIs, database design, and maintenance services.\n\n"
        "Core Rule: For each campaign, determine the target audience from the user's prompt, select the "
        "1-3 MOST RELEVANT technical/software services that solve this specific audience's business or operational bottlenecks, "
        "and use those 1-3 services consistently across the plan.\n"
        "Negative Constraint: NEVER invent non-technical services (such as generic digital marketing, SEO, social media ads, or sales coaching). "
        "The offer must strictly be software/technical solutions.\n\n"
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "campaign_name": "short descriptive name",\n'
        '  "industry": "the niche/industry",\n'
        '  "location": "primary target location",\n'
        '  "ideal_customer": "1-2 sentence description of who within this target audience should buy these technical services",\n'
        '  "pain_points": ["likely", "technical", "or", "operational", "pain", "points"],\n'
        '  "search_queries": ["4-6 specific varied search queries covering different cities/sub-niches/angles of this target — not just one generic query"],\n'
        '  "email_angle": "a clear 1-2 sentence description of the 1-3 specific software/technical services offered to solve their bottlenecks",\n'
        '  "qualification_rules": ["specific", "criteria", "for", "a", "good", "fit"]\n'
        "}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    content = _make_groq_request(messages=messages, temperature=0.4, max_tokens=1024)
    if not content:
        return None

    plan = _extract_json_payload(content)
    if not plan:
        logger.error("Groq service: failed to parse JSON from campaign plan response: %s", content[:200])
        return None

    required_keys = ["campaign_name", "industry", "location", "ideal_customer", "search_queries"]
    for key in required_keys:
        if key not in plan:
            logger.warning("Groq campaign plan response missing required key '%s'", key)
            return None

    return plan


def check_email_quality_ai(subject: str, body: str) -> dict | None:
    """
    Deeper, LLM-backed quality review — deliberately NOT called automatically.
    The deterministic checks (services/email_quality.py) run for free on every
    click; this is only invoked when the user explicitly clicks "AI Review",
    keeping Groq cost proportional to actual usage, not every draft view.
    """
    system_prompt = (
        "You are an expert cold-email copywriter reviewing a draft for quality. "
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "quality_score": "0-100 integer, overall email quality",\n'
        '  "spam_risk": "low, medium, or high",\n'
        '  "personalization_score": "0-100 integer, how personalized vs generic",\n'
        '  "cta_strength": "weak, good, or strong",\n'
        '  "issues": ["specific", "actionable", "critiques"]\n'
        "}"
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Subject: {subject}\n\nBody:\n{body}"},
    ]
    content = _make_groq_request(messages=messages, temperature=0.3, max_tokens=512)
    if not content:
        return None

    quality = _extract_json_payload(content)
    if not quality:
        logger.error("Groq service: failed to parse JSON from quality review response: %s", content[:200])
        return None

    return quality


def generate_cold_email(
    company_name: str,
    company_summary: str,
    pain_points: list,
    technologies: list,
    service_offered: str = ""
) -> dict | None:
    """
    Sends company research context to Groq LLM and asks it
    to generate a personalized cold email pitching the specified software service.

    Returns a validated dict with keys: subject, body
    Returns None if the API call fails or the response is not valid JSON.
    """
    system_prompt = (
        "You are an expert cold email copywriter for a software developer. "
        "Given company research data and the specific software service/offer being pitched, "
        "write a short, highly personalized cold email offering that technical solution. "
        "The email must be professional, concise, direct, and under 150 words. "
        "Do NOT use HTML. Plain text only. "
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "subject": "short compelling email subject line",\n'
        '  "body": "email body text max 150 words plain text no HTML"\n'
        "}"
    )

    pain_points_str = ", ".join(pain_points) if pain_points else "unknown"
    technologies_str = ", ".join(technologies) if technologies else "unknown"
    offer_str = service_offered.strip() if service_offered else "Custom software development, automation, and AI integrations"

    user_prompt = (
        f"Company name: {company_name}\n"
        f"Company summary: {company_summary}\n"
        f"Their technologies: {technologies_str}\n"
        f"Their possible pain points: {pain_points_str}\n"
        f"Our service/offer: {offer_str}\n\n"
        "Write a cold email offering our specific service to address one of their pain points."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    content = _make_groq_request(messages=messages, temperature=0.5, max_tokens=1024)
    if not content:
        return None

    email_data = _extract_json_payload(content)
    if not email_data:
        logger.error("Groq service: failed to parse JSON from cold email response: %s", content[:200])
        return None

    required_keys = ["subject", "body"]
    for key in required_keys:
        if key not in email_data:
            logger.warning("Groq cold email response missing required key '%s'", key)
            return None

    return email_data


def generate_followup_email(company_name: str, original_subject: str) -> dict | None:
    """
    Generate short 2 sentence followup email.
    Return dict with subject and body or None on failure.
    """
    system_prompt = (
        "You are an expert cold email copywriter. "
        "Write a casual, friendly 2 sentence follow-up email. "
        "Do NOT repeat the original pitch. Be friendly, not pushy. "
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "subject": "Re: original subject line",\n'
        '  "body": "casual 2 sentence follow up text"\n'
        "}"
    )

    user_prompt = (
        f"Company name: {company_name}\n"
        f"Original email subject: {original_subject}\n\n"
        "Write a quick, friendly 2 sentence follow-up email."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    content = _make_groq_request(messages=messages, temperature=0.5, max_tokens=512)
    if not content:
        return None

    followup_data = _extract_json_payload(content)
    if not followup_data:
        logger.error("Groq service: failed to parse JSON from follow-up response: %s", content[:200])
        return None

    required_keys = ["subject", "body"]
    for key in required_keys:
        if key not in followup_data:
            logger.warning("Groq follow-up email response missing required key '%s'", key)
            return None

    return followup_data
