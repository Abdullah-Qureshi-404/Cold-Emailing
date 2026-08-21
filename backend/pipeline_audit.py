"""
Pipeline Bottleneck Audit for Campaign 1
"""
import os, sys, time
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from models.campaign import Campaign
from sqlalchemy import func

db = SessionLocal()

CAMPAIGN_ID = 1

print("=" * 70)
print("PIPELINE BOTTLENECK AUDIT — Campaign 1")
print("=" * 70)

# 1. Campaign info
campaign = db.query(Campaign).filter(Campaign.id == CAMPAIGN_ID).first()
print(f"\nCampaign: {campaign.name} (ID={campaign.id})")
print(f"Status: {campaign.status.value}")
print(f"Created: {campaign.created_at}")

# 2. Lead status distribution
print("\n--- Lead Status Distribution ---")
status_counts = db.query(
    Lead.status, func.count(Lead.id)
).filter(
    Lead.campaign_id == CAMPAIGN_ID
).group_by(Lead.status).all()

total = 0
for status, count in sorted(status_counts, key=lambda x: x[1], reverse=True):
    print(f"  {status.value:25s} : {count:5d}")
    total += count
print(f"  {'TOTAL':25s} : {total:5d}")

# 3. Research completion rate
print("\n--- Research Progress ---")
research_count = db.query(func.count(LeadResearch.id)).join(
    Lead, LeadResearch.lead_id == Lead.id
).filter(
    Lead.campaign_id == CAMPAIGN_ID
).scalar()
print(f"Total LeadResearch records: {research_count}")

completed_research = db.query(func.count(LeadResearch.id)).join(
    Lead, LeadResearch.lead_id == Lead.id
).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    LeadResearch.research_status == "completed"
).scalar()
print(f"Completed research records: {completed_research}")

insufficient = db.query(func.count(LeadResearch.id)).join(
    Lead, LeadResearch.lead_id == Lead.id
).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    LeadResearch.research_status == "insufficient_data"
).scalar()
print(f"Insufficient data records: {insufficient}")

# 4. Check research_pending leads
print("\n--- Stuck Leads Analysis ---")
pending_count = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.status == LeadStatus.RESEARCH_PENDING
).scalar()
print(f"Leads stuck in RESEARCH_PENDING: {pending_count}")

email_found_count = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.status == LeadStatus.EMAIL_FOUND
).scalar()
print(f"Leads in EMAIL_FOUND (waiting for research): {email_found_count}")

found_count = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.status == LeadStatus.FOUND
).scalar()
print(f"Leads in FOUND (waiting for email discovery): {found_count}")

email_searching_count = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.status == LeadStatus.EMAIL_SEARCHING
).scalar()
print(f"Leads stuck in EMAIL_SEARCHING: {email_searching_count}")

# 5. Throughput from research timestamps
print("\n--- Throughput Estimation ---")
research_records = db.query(LeadResearch).join(
    Lead, LeadResearch.lead_id == Lead.id
).filter(
    Lead.campaign_id == CAMPAIGN_ID
).order_by(LeadResearch.created_at).all()

if research_records and len(research_records) >= 2:
    first = research_records[0].created_at
    last = research_records[-1].created_at
    if first and last:
        duration = (last - first).total_seconds()
        rate = len(research_records) / duration * 60 if duration > 0 else 0
        print(f"First research record: {first}")
        print(f"Last research record:  {last}")
        print(f"Duration: {duration:.0f}s ({duration/3600:.1f}h)")
        print(f"Total research records: {len(research_records)}")
        print(f"Average throughput: {rate:.2f} leads/minute")
        print(f"Average time per lead: {duration/len(research_records):.1f}s")
else:
    print("Not enough research records to estimate throughput")

# 6. Website coverage
print("\n--- Website Coverage ---")
with_website = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.website.isnot(None),
    Lead.website != ""
).scalar()
print(f"Leads with website: {with_website}/{total}")
print(f"Leads without website: {total - with_website}/{total}")

# 7. Redis lock status
print("\n--- Redis Lock Status ---")
try:
    import redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    if "ssl_cert_reqs=CERT_REQUIRED" in REDIS_URL:
        REDIS_URL = REDIS_URL.replace("ssl_cert_reqs=CERT_REQUIRED", "ssl_cert_reqs=required")
    r = redis.from_url(REDIS_URL, decode_responses=True)
    
    for stage in ["email_discovery", "research", "qualification", "email_writing"]:
        lock_key = f"campaign_lock:{CAMPAIGN_ID}:{stage}"
        val = r.get(lock_key)
        ttl = r.ttl(lock_key)
        if val:
            lock_age = int(time.time()) - int(val)
            print(f"  {stage:20s} : LOCKED (set {lock_age}s ago, TTL={ttl}s)")
        else:
            print(f"  {stage:20s} : unlocked")
    
    # Check all campaign locks
    print("\n  All campaign locks in Redis:")
    for key in r.scan_iter("campaign_lock:*"):
        val = r.get(key)
        ttl = r.ttl(key)
        print(f"    {key}: val={val}, TTL={ttl}s")
except Exception as e:
    print(f"  Redis check failed: {e}")

# 8. Email discovery step analysis
print("\n--- Email Discovery Analysis ---")
email_not_found = db.query(func.count(Lead.id)).filter(
    Lead.campaign_id == CAMPAIGN_ID,
    Lead.status == LeadStatus.EMAIL_NOT_FOUND
).scalar()
print(f"EMAIL_NOT_FOUND (dead ends): {email_not_found}")
print(f"EMAIL_FOUND (successfully discovered): {email_found_count}")
print(f"Email discovery success rate: {email_found_count/(email_found_count+email_not_found)*100:.1f}%" if (email_found_count+email_not_found) > 0 else "N/A")

# 9. Summary of bottleneck analysis
print("\n" + "=" * 70)
print("BOTTLENECK ANALYSIS SUMMARY")
print("=" * 70)
print("""
Per-lead processing in the RESEARCH stage involves:
  1. Website scrape (requests.get, timeout=10s)
  2. Groq API call (generate_company_research, timeout=30s)
  3. Website quality assessment (requests.get, timeout=10s)
  4. DB read/write (~1s via Supabase)

Current architecture:
  - Celery worker: --concurrency=16, -P threads
  - Research task: RESEARCH_CONCURRENCY=5 (ThreadPoolExecutor)
  - Email writing: EMAIL_WRITING_CONCURRENCY=5
  - Reconciler: every 30s (Celery Beat)
  - Stage locks: TTL=180-300s
  
Key bottleneck observations:
  1. Email discovery is SEQUENTIAL (one lead at a time)
  2. Research uses ThreadPoolExecutor(5) — moderate concurrency
  3. Qualification is SEQUENTIAL (but no external API calls = fast)
  4. Email writing uses ThreadPoolExecutor(5)
  5. Groq free tier rate limit: ~30 req/min → at 5 concurrent workers
     firing requests, we likely trigger 429s constantly
  6. Each research lead makes 2 HTTP calls + 1 Groq call = 3 network ops
  7. Lock TTLs (180-300s) can prevent retries if a task crashes
""")

db.close()
print("AUDIT COMPLETE")
