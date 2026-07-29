from fastapi import FastAPI

from database import engine, Base
from models import Campaign, Lead, LeadResearch
from models.email_draft import EmailDraft
from models.email_log import EmailLog

from api.campaigns import router as campaigns_router
from api.leads import router as leads_router


app = FastAPI()


# Create all database tables
Base.metadata.create_all(bind=engine)


app.include_router(
    campaigns_router,
    prefix="/campaigns"
)

app.include_router(
    leads_router,
    prefix="/leads"
)


@app.get("/")
def root():
    return {
        "message": "Cold Email Platform Running"
    }