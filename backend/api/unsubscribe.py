from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from database import get_db
from models.lead import Lead
from services.unsubscribe_token import verify_unsubscribe_token

router = APIRouter()


@router.get("/{token}", response_class=HTMLResponse)
def unsubscribe(token: str, db: Session = Depends(get_db)):
    """
    Public, no-auth endpoint linked from every outbound email (CAN-SPAM/GDPR
    compliance). Token is HMAC-signed so it can't be forged for other leads.
    """
    lead_id = verify_unsubscribe_token(token)
    if lead_id is None:
        return HTMLResponse("<h3>Invalid or expired unsubscribe link.</h3>", status_code=400)

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        lead.unsubscribed = True
        db.commit()

    return HTMLResponse(
        "<h3>You've been unsubscribed and won't receive further emails from us.</h3>"
    )
