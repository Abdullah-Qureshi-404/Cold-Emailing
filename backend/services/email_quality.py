"""
Deterministic email quality checks — run on every click with zero LLM cost.
An optional Groq-backed "AI Review" (services/groq_service.check_email_quality)
is available separately for when the user explicitly wants a deeper pass.
"""

import re

SPAM_WORDS = [
    "free money", "act now", "limited time", "click here", "buy now", "guarantee",
    "no obligation", "risk free", "winner", "congratulations", "urgent", "cash bonus",
    "100% free", "amazing deal", "cheap", "discount", "cure", "miracle",
]

CTA_PHRASES = [
    "let me know", "worth a quick chat", "open to a call", "interested in",
    "happy to share", "would you be open", "book a time", "schedule a call",
    "reply if", "let's chat", "quick call", "15 minutes", "worth exploring",
]

GREETING_PATTERN = re.compile(r"^\s*(hi|hey|hello|dear)\b", re.IGNORECASE)


def check_email_quality_deterministic(subject: str, body: str) -> dict:
    issues: list[str] = []
    subject = subject or ""
    body = body or ""
    text = f"{subject}\n{body}".lower()

    # Length checks
    if len(subject) > 60:
        issues.append("Subject line is long (60+ chars) — may get truncated in inboxes")
    if len(subject) < 10:
        issues.append("Subject line is very short — may look low-effort or spammy")
    word_count = len(body.split())
    if word_count > 200:
        issues.append(f"Body is long ({word_count} words) — cold emails convert better under ~150 words")
    if word_count < 30:
        issues.append(f"Body is very short ({word_count} words) — may lack enough personalization")

    # Spam words
    found_spam = [w for w in SPAM_WORDS if w in text]
    if found_spam:
        issues.append(f"Contains spam-trigger phrase(s): {', '.join(found_spam)}")

    # Excessive punctuation / shouting
    if "!!" in body or "!!" in subject:
        issues.append("Multiple exclamation marks — reads as spammy")
    if re.search(r"[A-Z]{5,}", body):
        issues.append("Contains ALL-CAPS words — reads as shouting/spammy")

    # Personalization signal — very rough heuristic: does it reference "you"/"your" at all
    personalization_hits = len(re.findall(r"\byour\b|\byou\b", body, re.IGNORECASE))
    personalization_score = min(100, personalization_hits * 15)
    if personalization_hits == 0:
        issues.append("No direct references to the recipient — reads generic")

    # Greeting / closing
    has_greeting = bool(GREETING_PATTERN.match(body.strip()))
    if not has_greeting:
        issues.append("No greeting detected at the start")
    has_closing = any(w in text for w in ["best,", "thanks,", "regards,", "cheers,", "best regards"])
    if not has_closing:
        issues.append("No sign-off/closing detected")

    # CTA
    has_cta = any(p in text for p in CTA_PHRASES) or "?" in body
    cta_strength = "strong" if any(p in text for p in CTA_PHRASES) else ("weak" if "?" in body else "missing")

    spam_risk = "high" if len(found_spam) >= 2 else ("medium" if found_spam else "low")

    # Overall score — deterministic, weighted
    score = 100
    score -= len(found_spam) * 15
    score -= 10 if not has_greeting else 0
    score -= 10 if not has_closing else 0
    score -= 15 if not has_cta else 0
    score -= 10 if word_count > 200 or word_count < 30 else 0
    score = max(0, min(100, score))

    return {
        "quality_score": score,
        "spam_risk": spam_risk,
        "personalization_score": personalization_score,
        "cta_strength": cta_strength,
        "issues": issues,
    }
