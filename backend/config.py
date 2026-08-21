import os
from dotenv import load_dotenv

load_dotenv()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "4"))
GROQ_INITIAL_RETRY_DELAY = float(os.getenv("GROQ_INITIAL_RETRY_DELAY", "2.0"))
GROQ_MAX_RETRY_DELAY = float(os.getenv("GROQ_MAX_RETRY_DELAY", "20.0"))
GROQ_MAX_CONCURRENT_REQUESTS = int(os.getenv("GROQ_MAX_CONCURRENT_REQUESTS", "2"))

# Pipeline Concurrency & Batch Settings
RESEARCH_CONCURRENCY = int(os.getenv("RESEARCH_CONCURRENCY", "3"))
RESEARCH_BATCH_SIZE = int(os.getenv("RESEARCH_BATCH_SIZE", "25"))
EMAIL_DISCOVERY_CONCURRENCY = int(os.getenv("EMAIL_DISCOVERY_CONCURRENCY", "5"))
EMAIL_DISCOVERY_BATCH_SIZE = int(os.getenv("EMAIL_DISCOVERY_BATCH_SIZE", "50"))
STAGE_LOCK_TTL_SECONDS = int(os.getenv("STAGE_LOCK_TTL_SECONDS", "120"))
STAGE_THROTTLE_SECONDS = int(os.getenv("STAGE_THROTTLE_SECONDS", "45"))

# Qualification & Approval Thresholds
MIN_QUALIFICATION_CONFIDENCE = int(os.getenv("MIN_QUALIFICATION_CONFIDENCE", "30"))
# Below this, research judged the lead a poor fit for a solo/freelance
# developer's ICP (e.g. looks like a large, well-funded company).
MIN_ICP_FIT_SCORE = int(os.getenv("MIN_ICP_FIT_SCORE", "40"))
AUTO_APPROVE_CONFIDENCE_THRESHOLD = int(os.getenv("AUTO_APPROVE_CONFIDENCE_THRESHOLD", "70"))

# Gmail API Settings
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")
GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL")

