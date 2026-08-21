"""
Benchmark individual components of the research pipeline
to identify exactly where time is spent per lead.
"""
import os, time
from dotenv import load_dotenv
load_dotenv()

# 1. Benchmark Groq API call
print("=" * 60)
print("COMPONENT-LEVEL BENCHMARKS")
print("=" * 60)

from services.groq_service import _make_groq_request
from config import GROQ_API_KEY

print(f"\n--- Groq API Benchmark ---")
print(f"API Key configured: {'Yes' if GROQ_API_KEY else 'NO'}")

messages = [
    {"role": "system", "content": "Return a single word."},
    {"role": "user", "content": "Hello"}
]

for i in range(3):
    start = time.time()
    result = _make_groq_request(messages, temperature=0.1, max_tokens=10)
    elapsed = time.time() - start
    print(f"  Groq call #{i+1}: {elapsed:.2f}s (result: {result})")
    time.sleep(0.5)

# 2. Benchmark website scrape
print(f"\n--- Website Scrape Benchmark ---")
from services.company_scraper import extract_company_information

test_urls = [
    "https://example.com",
    "https://github.com",
]

for url in test_urls:
    start = time.time()
    text = extract_company_information(url)
    elapsed = time.time() - start
    length = len(text) if text else 0
    print(f"  {url}: {elapsed:.2f}s (chars: {length})")

# 3. Benchmark website quality assessment
print(f"\n--- Website Quality Assessment Benchmark ---")
from services.website_quality import assess_website_quality

for url in test_urls:
    start = time.time()
    score, issues = assess_website_quality(url)
    elapsed = time.time() - start
    print(f"  {url}: {elapsed:.2f}s (score: {score}, issues: {issues})")

# 4. Benchmark DB round-trip
print(f"\n--- Database Round-Trip Benchmark ---")
from database import SessionLocal
from models.lead import Lead
from sqlalchemy import func

for i in range(3):
    start = time.time()
    db = SessionLocal()
    count = db.query(func.count(Lead.id)).scalar()
    db.close()
    elapsed = time.time() - start
    print(f"  DB query #{i+1}: {elapsed:.2f}s (lead count: {count})")

# 5. Full research pipeline estimate
print(f"\n--- Full Research Pipeline Time Estimate (per lead) ---")
print(f"  Website scrape:  ~1-3s typical, up to 10s timeout")
print(f"  Groq research:   ~1-3s typical, up to 30s timeout + retries on 429")
print(f"  Website quality:  ~1-3s typical, up to 10s timeout")
print(f"  DB operations:   ~0.5-1s")
print(f"  ----------------------------------------")
print(f"  TOTAL per lead:  ~4-10s typical")
print(f"  With 5 concurrent workers: ~1-2s effective per lead")
print(f"  BUT: Groq rate limit (30 req/min free tier)")
print(f"    5 workers firing = ~15-30 req/min => constant 429s")
print(f"    With backoff: effective rate drops to ~5-8 leads/min")
print(f"    For 401 pending leads: ~50-80 min best case, ~2h+ with retries")

print(f"\n" + "=" * 60)
print("BENCHMARK COMPLETE")
print("=" * 60)
