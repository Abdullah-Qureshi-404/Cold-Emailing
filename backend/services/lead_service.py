import re
from sqlalchemy.orm import Session
from models.lead import Lead, LeadStatus


def _normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    return email.strip().lower()


def _normalize_website(website: str | None) -> str | None:
    if not website:
        return None
    w = website.strip().lower()
    w = re.sub(r"^https?://", "", w)
    w = re.sub(r"^www\.", "", w)
    w = w.rstrip("/")
    return w or None


def _normalize_company(name: str | None) -> str | None:
    if not name:
        return None
    return re.sub(r"\s+", " ", name.strip().lower()) or None


def save_leads(
    db: Session,
    leads: list[dict]
) -> tuple[list[Lead], int]:
    """
    Saves normalized leads into database, skipping duplicates.

    Match priority (most to least reliable):
      1. Normalized email — the strongest signal, one inbox per person.
      2. Normalized website (scheme/www/trailing-slash stripped).
      3. Normalized company name, scoped to the same campaign (many
         companies share names across campaigns, so this fallback never
         crosses campaign boundaries).

    Returns (saved_leads, duplicates_skipped_count).
    """
    if not leads:
        return [], 0

    campaign_id = leads[0]["campaign_id"]

    existing = db.query(Lead.email, Lead.website, Lead.company_name).filter(
        Lead.campaign_id == campaign_id
    ).all()
    seen_emails = {_normalize_email(e) for e, _, _ in existing if e}
    seen_websites = {_normalize_website(w) for _, w, _ in existing if w}
    seen_companies = {_normalize_company(c) for _, _, c in existing if c}

    saved_leads = []
    skipped = 0

    for lead_data in leads:
        email_n = _normalize_email(lead_data.get("email"))
        website_n = _normalize_website(lead_data.get("website"))
        company_n = _normalize_company(lead_data.get("company_name"))

        is_duplicate = (
            (email_n and email_n in seen_emails)
            or (website_n and website_n in seen_websites)
            or (not email_n and not website_n and company_n and company_n in seen_companies)
        )
        if is_duplicate:
            skipped += 1
            continue

        # Determine appropriate status enum value
        status_input = lead_data.get("status", "found")
        if isinstance(status_input, LeadStatus):
            status_enum = status_input
        else:
            try:
                status_enum = LeadStatus[status_input.upper()]
            except KeyError:
                status_enum = LeadStatus.FOUND

        lead = Lead(
            campaign_id=lead_data["campaign_id"],
            company_name=lead_data["company_name"],
            contact_name=lead_data.get("contact_name"),
            website=lead_data.get("website"),
            phone=lead_data.get("phone"),
            email=lead_data.get("email"),
            source=lead_data.get("source"),
            github_url=lead_data.get("github_url"),
            twitter_url=lead_data.get("twitter_url"),
            status=status_enum,
            raw_data=lead_data.get("raw_data")
        )

        db.add(lead)
        saved_leads.append(lead)

        # Track within this batch too, so duplicates *within* one scrape
        # result (not just against the DB) are also caught.
        if email_n:
            seen_emails.add(email_n)
        if website_n:
            seen_websites.add(website_n)
        if company_n:
            seen_companies.add(company_n)

    db.commit()

    for lead in saved_leads:
        db.refresh(lead)

    return saved_leads, skipped
