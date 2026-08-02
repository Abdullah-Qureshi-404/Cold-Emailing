"""
Deterministic lead scoring — intentionally NOT an LLM call. Every input here
(confidence_score, icp_fit_score, website_quality_score, estimated_team_size,
website_issues) is already computed and stored by the research step, so
scoring is just weighted arithmetic over existing data: instant, free, and
fully explainable (every point is traceable to a specific stored fact).
"""

from models.lead_research import LeadResearch


def score_lead(research: LeadResearch | None) -> tuple[int, list[str]]:
    """Returns (lead_score 0-100, score_reasons as ✓/✗ bullet strings)."""
    if not research:
        return 0, ["✗ Not researched yet"]

    reasons: list[str] = []
    score = 0.0

    # Confidence in the research itself (40% weight) — garbage-in-garbage-out
    # protection: a low-confidence research shouldn't produce a high score.
    confidence = research.confidence_score or 0
    score += confidence * 0.4
    if confidence >= 70:
        reasons.append(f"✓ High research confidence ({confidence}/100)")
    elif confidence >= 40:
        reasons.append(f"~ Moderate research confidence ({confidence}/100)")
    else:
        reasons.append(f"✗ Low research confidence ({confidence}/100)")

    # ICP fit (35% weight) — the main "is this actually our customer" signal.
    icp_fit = research.icp_fit_score if research.icp_fit_score is not None else 50
    score += icp_fit * 0.35
    if icp_fit >= 70:
        reasons.append(f"✓ Strong ICP fit ({icp_fit}/100)")
    elif icp_fit >= 40:
        reasons.append(f"~ Partial ICP fit ({icp_fit}/100)")
    else:
        reasons.append(f"✗ Weak ICP fit ({icp_fit}/100)")

    # Website quality (25% weight) — inverted: a BAD website is a GOOD sales
    # signal for a freelancer selling web/dev services, so low quality here
    # adds to the opportunity score rather than subtracting.
    quality = research.website_quality_score
    if quality is not None:
        opportunity = 100 - quality
        score += opportunity * 0.25
        if quality < 50:
            reasons.append(f"✓ Outdated/neglected website (quality {quality}/100) — clear opportunity")
        else:
            reasons.append(f"~ Website already in decent shape (quality {quality}/100)")
    else:
        score += 50 * 0.25  # neutral if no website to assess

    # Team size — hard signal, not a weighted blend: a large/enterprise
    # company is essentially never the right fit for cheap freelance work,
    # so this caps the score outright rather than just nudging it.
    team_size = (research.estimated_team_size or "").strip().lower()
    if team_size == "large":
        score = min(score, 20)
        reasons.append("✗ Looks like a large/enterprise company")
    elif team_size == "solo":
        reasons.append("✓ Solo operator — ideal fit")
    elif team_size == "small":
        reasons.append("✓ Small team")

    if research.website_issues:
        reasons.append(f"✗ Website issues: {', '.join(research.website_issues)}")

    return round(max(0, min(100, score))), reasons
