import json
import logging
import random
import time
import requests

from config import (
    GROQ_API_KEY,
    GROQ_API_URL,
    GROQ_MODEL,
    GROQ_MAX_RETRIES,
    GROQ_INITIAL_RETRY_DELAY,
    GROQ_MAX_RETRY_DELAY
)

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _make_groq_request(messages: list[dict], temperature: float = 0.3, max_tokens: int = 1024) -> str | None:
    """
    Central helper to invoke Groq OpenAI-compatible chat completion API with
    exponential backoff + jitter and Retry-After header support.

    Retries strictly for retryable HTTP status codes (429, 500, 502, 503, 504).
    Does NOT retry authentication (401) or bad request (400) errors.
    Returns the string content of the model's message or None on failure.
    """
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

    for attempt in range(1, GROQ_MAX_RETRIES + 1):
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
                    # Exponential backoff with jitter
                    calculated = GROQ_INITIAL_RETRY_DELAY * (2 ** (attempt - 1))
                    jitter = random.uniform(0.0, 0.5)
                    wait_seconds = min(GROQ_MAX_RETRY_DELAY, calculated + jitter)

                logger.warning(
                    "Groq API HTTP %d (attempt %d/%d). Retrying in %.2fs...",
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
                wait_seconds = min(GROQ_MAX_RETRY_DELAY, GROQ_INITIAL_RETRY_DELAY * (2 ** (attempt - 1)))
                time.sleep(wait_seconds)
                continue
            else:
                logger.error("Groq API request failed after %d network retries: %s", GROQ_MAX_RETRIES, e)
                return None

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

    try:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)

        research = json.loads(content)

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

    except json.JSONDecodeError as e:
        logger.error("Groq service: failed to parse JSON from research response: %s", e)
        return None


def generate_campaign_plan(prompt: str) -> dict | None:
    """
    Turns a one-line description of an ideal customer (e.g. "Find dentists
    in Texas with fewer than 20 employees") into structured campaign setup
    fields. Returned as a SUGGESTION for the user to review/edit — nothing
    calling this creates a campaign automatically.
    """
    system_prompt = (
        "You are a B2B outreach strategist. Given a one-line description of "
        "who someone wants to reach, produce a structured JSON campaign plan. "
        "Respond ONLY with valid JSON. No markdown, no extra text.\n\n"
        "Required JSON format:\n"
        "{\n"
        '  "campaign_name": "short descriptive name",\n'
        '  "industry": "the niche/industry",\n'
        '  "location": "primary target location",\n'
        '  "ideal_customer": "1-2 sentence description of the target customer",\n'
        '  "pain_points": ["likely", "business", "pain", "points"],\n'
        '  "search_queries": ["4-6 specific varied search queries covering different'
        ' cities/sub-niches/angles of this target — not just one generic query"],\n'
        '  "email_angle": "the core angle/hook a cold email to this audience should use",\n'
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

    try:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)

        plan = json.loads(content)

        required_keys = ["campaign_name", "industry", "location", "ideal_customer", "search_queries"]
        for key in required_keys:
            if key not in plan:
                logger.warning("Groq campaign plan response missing required key '%s'", key)
                return None

        return plan

    except json.JSONDecodeError as e:
        logger.error("Groq service: failed to parse JSON from campaign plan response: %s", e)
        return None


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
    try:
        content = content.strip()
        if content.startswith("```"):
            lines = [l for l in content.split("\n") if not l.strip().startswith("```")]
            content = "\n".join(lines)
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error("Groq service: failed to parse JSON from quality review response: %s", e)
        return None


def generate_cold_email(
    company_name: str,
    company_summary: str,
    pain_points: list,
    technologies: list
) -> dict | None:
    """
    Sends company research context to Groq LLM and asks it
    to generate a personalized cold email.

    Returns a validated dict with keys: subject, body
    Returns None if the API call fails or the response is not valid JSON.
    """
    system_prompt = (
        "You are an expert cold email copywriter. "
        "Given company research data, write a short personalized cold email. "
        "The email must be professional, concise, and under 150 words. "
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

    user_prompt = (
        f"Company name: {company_name}\n"
        f"Company summary: {company_summary}\n"
        f"Their technologies: {technologies_str}\n"
        f"Their possible pain points: {pain_points_str}\n\n"
        "Write a cold email offering help with one of their pain points."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    content = _make_groq_request(messages=messages, temperature=0.5, max_tokens=1024)
    if not content:
        return None

    try:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)

        email_data = json.loads(content)

        required_keys = ["subject", "body"]
        for key in required_keys:
            if key not in email_data:
                logger.warning("Groq cold email response missing required key '%s'", key)
                return None

        return email_data

    except json.JSONDecodeError as e:
        logger.error("Groq service: failed to parse JSON from cold email response: %s", e)
        return None


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

    try:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)

        followup_data = json.loads(content)

        required_keys = ["subject", "body"]
        for key in required_keys:
            if key not in followup_data:
                logger.warning("Groq follow-up email response missing required key '%s'", key)
                return None

        return followup_data

    except json.JSONDecodeError as e:
        logger.error("Groq service: failed to parse JSON from follow-up response: %s", e)
        return None
