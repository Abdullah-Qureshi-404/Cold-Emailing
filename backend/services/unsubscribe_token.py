import hashlib
import hmac
import os

# Falls back to a fixed dev secret if not set — fine for local/dev, but set
# UNSUBSCRIBE_SECRET in production so tokens can't be forged across deployments.
SECRET = os.getenv("UNSUBSCRIBE_SECRET", "dev-only-unsubscribe-secret-change-me")


def make_unsubscribe_token(lead_id: int) -> str:
    """HMAC-signed token so unsubscribe links can't be guessed/forged for other leads."""
    digest = hmac.new(SECRET.encode(), str(lead_id).encode(), hashlib.sha256).hexdigest()[:16]
    return f"{lead_id}.{digest}"


def verify_unsubscribe_token(token: str) -> int | None:
    """Returns the lead_id if the token is valid, else None."""
    try:
        lead_id_str, digest = token.split(".", 1)
        lead_id = int(lead_id_str)
    except (ValueError, AttributeError):
        return None
    expected = make_unsubscribe_token(lead_id).split(".", 1)[1]
    if hmac.compare_digest(digest, expected):
        return lead_id
    return None
