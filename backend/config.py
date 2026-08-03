import os
from dotenv import load_dotenv

load_dotenv()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "3"))
GROQ_INITIAL_RETRY_DELAY = float(os.getenv("GROQ_INITIAL_RETRY_DELAY", "1.0"))
GROQ_MAX_RETRY_DELAY = float(os.getenv("GROQ_MAX_RETRY_DELAY", "16.0"))

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
