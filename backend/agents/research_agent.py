import logging
from sqlalchemy.orm import Session

from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from services.company_scraper import extract_company_information
from services.groq_service import generate_company_research
from services.website_quality import assess_website_quality

logger = logging.getLogger(__name__)


def research_lead(lead: Lead, db: Session) -> bool:
    """
    Runs the full research pipeline for a single lead:

    1. Transition status: EMAIL_FOUND -> RESEARCH_PENDING
    2. Scrape company website for text content & capture metadata
    3. Send content to Groq LLM for structured research
    4. Validate research quality
    5. Save/update research results into LeadResearch table idempotently
    6. Transition status: RESEARCH_PENDING -> RESEARCH_COMPLETE

    Returns True if research completed with valid data, False if insufficient data / failed.
    """
    logger.info("Research agent: starting research for lead %d (%s)", lead.id, lead.company_name)

    # Step 1: Mark lead as RESEARCH_PENDING
    lead.status = LeadStatus.RESEARCH_PENDING
    db.commit()

    # Step 2: Extract company website content and capture metadata for reuse
    company_text = None
    website_meta = None
    website_content_length = 0

    if lead.website:
        company_text, website_meta = extract_company_information(lead.website, return_meta=True)
        if company_text:
            website_content_length = len(company_text)

    if not company_text:
        company_text = f"Company name: {lead.company_name}"
        if lead.raw_data and isinstance(lead.raw_data, dict):
            category = lead.raw_data.get("category", "")
            bio = lead.raw_data.get("bio", "")
            if category:
                company_text += f"\nCategory: {category}"
            if bio:
                company_text += f"\nBio: {bio}"

    # Step 3: Generate structured research via Groq LLM
    research_data = generate_company_research(
        company_name=lead.company_name,
        company_text=company_text
    )

    # "Does this lead actually need our help" evidence — reuse pre-fetched website response
    website_quality_score, website_issues = assess_website_quality(lead.website, pre_fetched_meta=website_meta)

    # Step 4: Extract research fields or fallback
    if research_data:
        company_summary = research_data.get("company_summary", "")
        business_model = research_data.get("business_model", "")
        technologies = research_data.get("technologies", [])
        pain_points_data = {
            "possible_pain_points": research_data.get("possible_pain_points", []),
            "personalization_angles": research_data.get("personalization_angles", [])
        }
        estimated_team_size = research_data.get("estimated_team_size")
        icp_fit_score = research_data.get("icp_fit_score")
        if isinstance(icp_fit_score, str) and icp_fit_score.isdigit():
            icp_fit_score = int(icp_fit_score)
        if not isinstance(icp_fit_score, int):
            icp_fit_score = None

        has_summary = bool(company_summary and company_summary.strip())
        has_description = bool(business_model and business_model.strip())
        has_tech_or_pain = (
            bool(technologies and len(technologies) > 0) or
            bool(research_data.get("possible_pain_points") and len(research_data.get("possible_pain_points")) > 0)
        )
        is_valid = has_summary and has_description and has_tech_or_pain
    else:
        logger.warning("Research agent: AI research returned no data for lead %d (%s)", lead.id, lead.company_name)
        company_summary = f"Profile for {lead.company_name}"
        business_model = ""
        technologies = []
        pain_points_data = {"possible_pain_points": [], "personalization_angles": []}
        estimated_team_size = None
        icp_fit_score = None
        is_valid = False

    # Step 5: Calculate confidence score and determine research_status
    if is_valid:
        score = 0
        if website_content_length > 100:
            score += 30
        if lead.email is not None:
            score += 20
        if technologies and len(technologies) > 0:
            score += 20
        if research_data.get("possible_pain_points") and len(research_data.get("possible_pain_points")) > 0:
            score += 20
        if lead.raw_data is not None:
            score += 10

        research_status = "completed"
        confidence_score = score
    else:
        research_status = "insufficient_data"
        confidence_score = None

    sources_used = []
    if website_content_length > 0:
        sources_used.append("website")
    if lead.raw_data is not None:
        sources_used.append("raw_data")
    if lead.email is not None:
        sources_used.append("email")

    # Step 6: Save or update results in LeadResearch table (Idempotent check)
    existing_research = db.query(LeadResearch).filter(LeadResearch.lead_id == lead.id).first()

    if existing_research:
        existing_research.company_summary = company_summary
        existing_research.company_description = business_model
        existing_research.technologies = technologies
        existing_research.pain_points = pain_points_data
        existing_research.research_status = research_status
        existing_research.confidence_score = confidence_score
        existing_research.sources_used = sources_used
        existing_research.website_quality_score = website_quality_score
        existing_research.website_issues = website_issues
        existing_research.estimated_team_size = estimated_team_size
        existing_research.icp_fit_score = icp_fit_score
    else:
        new_research = LeadResearch(
            lead_id=lead.id,
            company_summary=company_summary,
            company_description=business_model,
            technologies=technologies,
            pain_points=pain_points_data,
            research_status=research_status,
            confidence_score=confidence_score,
            sources_used=sources_used,
            website_quality_score=website_quality_score,
            website_issues=website_issues,
            estimated_team_size=estimated_team_size,
            icp_fit_score=icp_fit_score
        )
        db.add(new_research)

    # Step 7: Always transition status to RESEARCH_COMPLETE so qualification can evaluate it
    lead.status = LeadStatus.RESEARCH_COMPLETE
    db.commit()

    if is_valid:
        logger.info("Research agent: completed valid research for lead %d (%s) [confidence=%s]", lead.id, lead.company_name, confidence_score)
        return True
    else:
        logger.info("Research agent: recorded insufficient_data research for lead %d (%s)", lead.id, lead.company_name)
        return False
