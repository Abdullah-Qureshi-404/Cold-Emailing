import base64
import logging
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import (
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
    GMAIL_SENDER_EMAIL
)

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly"
]


def get_gmail_service():
    """
    Build Gmail API service using stored OAuth2 credentials.
    Returns Gmail service object or None on failure.
    """
    if not all([GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN]):
        logger.warning("Gmail service: Missing Gmail OAuth credentials in configuration")
        return None

    try:
        creds = Credentials(
            token=None,
            refresh_token=GMAIL_REFRESH_TOKEN,
            client_id=GMAIL_CLIENT_ID,
            client_secret=GMAIL_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
            scopes=SCOPES
        )

        service = build("gmail", "v1", credentials=creds)
        return service

    except Exception as e:
        logger.error("Gmail service authentication error: %s", e)
        return None


def send_email(to_email: str, subject: str, body: str) -> dict | None:
    """
    Send plain text email via Gmail API.
    Returns dict with gmail_message_id and gmail_thread_id or None on failure.
    """
    service = get_gmail_service()
    if not service:
        logger.warning("Gmail service unavailable for sending email")
        return None

    try:
        message = EmailMessage()
        message.set_content(body)
        message["To"] = to_email
        message["Subject"] = subject

        if GMAIL_SENDER_EMAIL:
            message["From"] = GMAIL_SENDER_EMAIL

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        sent_message = service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()

        return {
            "gmail_message_id": sent_message.get("id"),
            "gmail_thread_id": sent_message.get("threadId")
        }

    except HttpError as e:
        logger.error("Gmail API HTTP error while sending email to %s: %s", to_email, e)
        return None
    except Exception as e:
        logger.error("Gmail service error while sending email to %s: %s", to_email, e)
        return None


def check_thread_for_reply(thread_id: str) -> bool:
    """
    Check if a Gmail thread has more than one message.
    Returns True if reply exists, False otherwise.
    """
    if not thread_id:
        return False

    service = get_gmail_service()
    if not service:
        logger.warning("Gmail service unavailable for reply check")
        return False

    try:
        thread = service.users().threads().get(
            userId="me",
            id=thread_id
        ).execute()

        messages = thread.get("messages", [])
        return len(messages) > 1

    except HttpError as e:
        logger.error("Gmail API HTTP error while checking thread %s: %s", thread_id, e)
        return False
    except Exception as e:
        logger.error("Gmail service error while checking thread %s: %s", thread_id, e)
        return False
