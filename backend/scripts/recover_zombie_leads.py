"""
Idempotent Zombie Lead Recovery Script
- Finds leads stuck in RESEARCH_PENDING without LeadResearch -> resets to EMAIL_FOUND
- Finds leads stuck in RESEARCH_PENDING with LeadResearch -> advances to RESEARCH_COMPLETE
- Safe to run multiple times. Supports --dry-run.
"""
import os
import sys
import argparse
from dotenv import load_dotenv

load_dotenv()

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from sqlalchemy import func


def recover_zombie_leads(campaign_id: int | None = None, dry_run: bool = False):
    db = SessionLocal()
    try:
        query = db.query(Lead).filter(Lead.status == LeadStatus.RESEARCH_PENDING)
        if campaign_id is not None:
            query = query.filter(Lead.campaign_id == campaign_id)

        pending_leads = query.all()
        total_pending = len(pending_leads)

        print(f"[{'DRY-RUN' if dry_run else 'LIVE'}] Found {total_pending} leads in RESEARCH_PENDING"
              f"{f' for Campaign {campaign_id}' if campaign_id else ' across all campaigns'}.")

        if not pending_leads:
            print("No zombie leads found. System is clean.")
            return {"reset_to_email_found": 0, "advanced_to_research_complete": 0}

        pending_ids = [l.id for l in pending_leads]

        # Check which leads already have LeadResearch records
        research_records = db.query(LeadResearch.lead_id, LeadResearch.research_status).filter(
            LeadResearch.lead_id.in_(pending_ids)
        ).all()

        research_map = {r[0]: r[1] for r in research_records}

        leads_to_reset = []
        leads_to_advance = []

        for lead in pending_leads:
            if lead.id in research_map:
                leads_to_advance.append(lead)
            else:
                leads_to_reset.append(lead)

        print(f"  - Leads with NO research record (to reset -> EMAIL_FOUND): {len(leads_to_reset)}")
        print(f"  - Leads WITH research record (to advance -> RESEARCH_COMPLETE): {len(leads_to_advance)}")

        if dry_run:
            print("[DRY-RUN] No changes were made to the database.")
            return {
                "reset_to_email_found": len(leads_to_reset),
                "advanced_to_research_complete": len(leads_to_advance)
            }

        # Apply updates
        for lead in leads_to_reset:
            lead.status = LeadStatus.EMAIL_FOUND

        for lead in leads_to_advance:
            lead.status = LeadStatus.RESEARCH_COMPLETE

        db.commit()
        print(f"[LIVE] Successfully updated {len(leads_to_reset)} leads to EMAIL_FOUND "
              f"and {len(leads_to_advance)} leads to RESEARCH_COMPLETE.")

        return {
            "reset_to_email_found": len(leads_to_reset),
            "advanced_to_research_complete": len(leads_to_advance)
        }

    except Exception as e:
        db.rollback()
        print(f"ERROR during zombie lead recovery: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Recover zombie RESEARCH_PENDING leads")
    parser.add_argument("--campaign-id", type=int, default=None, help="Optional campaign ID to filter")
    parser.add_argument("--dry-run", action="store_true", help="Audit only, do not commit changes")
    args = parser.parse_args()

    recover_zombie_leads(campaign_id=args.campaign_id, dry_run=args.dry_run)
