import logging
from sqlalchemy.orm import Session

from config import MIN_QUALIFICATION_CONFIDENCE, MIN_ICP_FIT_SCORE
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
    4. estimated_team_size is "large" (enterprise-scale) -> DISQUALIFIED
    5. icp_fit_score is present and below MIN_ICP_FIT_SCORE -> DISQUALIFIED
    6. Otherwise -> QUALIFIED

    Returns True if qualified, False if disqualified.
    """
    research = db.query(LeadResearch).filter(
        LeadResearch.lead_id == lead.id
    ).first()

    # Rule 1: No research exists
    if not research:
        lead.status = LeadStatus.DISQUALIFIED
        lead.qualification_reason = "No research data was found for this lead (research step may have failed)."
        db.commit()
        logger.info("Qualification agent: lead %d (%s) DISQUALIFIED — no research data found", lead.id, lead.company_name)
        return False

    # Rule 2: Research status marked insufficient_data
    if research.research_status == "insufficient_data":
        lead.status = LeadStatus.DISQUALIFIED
        lead.qualification_reason = "Not enough usable content was found on their website/profile to research them properly."
        db.commit()
        logger.info("Qualification agent: lead %d (%s) DISQUALIFIED — insufficient data status", lead.id, lead.company_name)
        return False

    # Rule 3: Confidence score evaluation against threshold
    if research.confidence_score is None or research.confidence_score < MIN_QUALIFICATION_CONFIDENCE:
        lead.status = LeadStatus.DISQUALIFIED
        lead.qualification_reason = f"Research confidence score ({research.confidence_score}) was below the minimum ({MIN_QUALIFICATION_CONFIDENCE}) — the data found about them wasn't solid enough to trust."
        db.commit()
        logger.info(
            "Qualification agent: lead %d (%s) DISQUALIFIED — confidence score %s below threshold %d",
            lead.id,
            lead.company_name,
            research.confidence_score,
            MIN_QUALIFICATION_CONFIDENCE
        )
        return False

    # Rule 4: Reject leads that look like large/enterprise companies —
    # wrong ICP for a solo freelancer selling cheap dev/design services.
    if (research.estimated_team_size or "").strip().lower() == "large":
        lead.status = LeadStatus.DISQUALIFIED
        lead.qualification_reason = "Looks like a large/enterprise company based on their site — not a fit for cheap freelance/solo services."
        db.commit()
        logger.info(
            "Qualification agent: lead %d (%s) DISQUALIFIED — estimated team size is large (wrong ICP)",
            lead.id, lead.company_name
        )
        return False

    # Rule 5: Reject leads that don't fit the ICP even if data quality is fine.
    if research.icp_fit_score is not None and research.icp_fit_score < MIN_ICP_FIT_SCORE:
        lead.status = LeadStatus.DISQUALIFIED
        lead.qualification_reason = f"ICP fit score ({research.icp_fit_score}/100) was below the minimum ({MIN_ICP_FIT_SCORE}) — doesn't look like a solo/small-team fit for your services."
        db.commit()
        logger.info(
            "Qualification agent: lead %d (%s) DISQUALIFIED — ICP fit score %d below threshold %d",
            lead.id, lead.company_name, research.icp_fit_score, MIN_ICP_FIT_SCORE
        )
        return False

    # All business qualification checks passed
    lead.status = LeadStatus.QUALIFIED
    reason_bits = [f"Research confidence {research.confidence_score}/100"]
    if research.icp_fit_score is not None:
        reason_bits.append(f"ICP fit {research.icp_fit_score}/100")
    if research.estimated_team_size:
        reason_bits.append(f"looks {research.estimated_team_size}-sized")
    if research.website_issues:
        reason_bits.append(f"website issues: {', '.join(research.website_issues)}")
    lead.qualification_reason = "Qualified — " + "; ".join(reason_bits) + "."
    db.commit()
    logger.info(
        "Qualification agent: lead %d (%s) QUALIFIED [confidence=%d]",
        lead.id,
        lead.company_name,
        research.confidence_score
    )
    return True
