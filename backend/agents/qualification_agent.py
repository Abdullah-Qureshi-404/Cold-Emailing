import logging
from sqlalchemy.orm import Session

from config import MIN_QUALIFICATION_CONFIDENCE
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch

logger = logging.getLogger(__name__)


def qualify_lead(lead: Lead, db: Session) -> bool:
    """
    Qualifies or disqualifies a lead based on business qualification rules
    and data quality metrics.

    Rules:
    1. No research record exists -> DISQUALIFIED
    2. research_status is "insufficient_data" -> DISQUALIFIED
    3. confidence_score is None or below MIN_QUALIFICATION_CONFIDENCE -> DISQUALIFIED
    4. Otherwise -> QUALIFIED

    Returns True if qualified, False if disqualified.
    """
    research = db.query(LeadResearch).filter(
        LeadResearch.lead_id == lead.id
    ).first()

    # Rule 1: No research exists
    if not research:
        lead.status = LeadStatus.DISQUALIFIED
        db.commit()
        logger.info("Qualification agent: lead %d (%s) DISQUALIFIED — no research data found", lead.id, lead.company_name)
        return False

    # Rule 2: Research status marked insufficient_data
    if research.research_status == "insufficient_data":
        lead.status = LeadStatus.DISQUALIFIED
        db.commit()
        logger.info("Qualification agent: lead %d (%s) DISQUALIFIED — insufficient data status", lead.id, lead.company_name)
        return False

    # Rule 3: Confidence score evaluation against threshold
    if research.confidence_score is None or research.confidence_score < MIN_QUALIFICATION_CONFIDENCE:
        lead.status = LeadStatus.DISQUALIFIED
        db.commit()
        logger.info(
            "Qualification agent: lead %d (%s) DISQUALIFIED — confidence score %s below threshold %d",
            lead.id,
            lead.company_name,
            research.confidence_score,
            MIN_QUALIFICATION_CONFIDENCE
        )
        return False

    # All business qualification checks passed
    lead.status = LeadStatus.QUALIFIED
    db.commit()
    logger.info(
        "Qualification agent: lead %d (%s) QUALIFIED [confidence=%d]",
        lead.id,
        lead.company_name,
        research.confidence_score
    )
    return True
