from sqlalchemy.orm import Session
from models.lead import Lead, LeadStatus


def save_leads(
    db: Session,
    leads: list[dict]
) -> list[Lead]:
    """
    Saves normalized leads into database.
    Handles LeadStatus conversion and sets fields according to standard lead model.
    """
    saved_leads = []

    for lead_data in leads:
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

    db.commit()

    for lead in saved_leads:
        db.refresh(lead)

    return saved_leads