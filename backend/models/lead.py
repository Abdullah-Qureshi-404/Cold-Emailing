from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class LeadStatus(enum.Enum):
    FOUND = "found"
    EMAIL_SEARCHING = "email_searching"
    EMAIL_FOUND = "email_found"
    EMAIL_NOT_FOUND = "email_not_found"

    RESEARCH_PENDING = "research_pending"
    RESEARCH_COMPLETE = "research_complete"

    QUALIFIED = "qualified"
    DISQUALIFIED = "disqualified"

    EMAIL_GENERATED = "email_generated"
    WAITING_APPROVAL = "waiting_approval"

    QUEUED = "queued"
    SENT = "sent"

    FOLLOWUP_1 = "followup_1"
    FOLLOWUP_2 = "followup_2"

    REPLIED = "replied"
    COLD = "cold"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    campaign_id = Column(
        Integer,
        ForeignKey("campaigns.id"),
        nullable=False
    )

    company_name = Column(
        String,
        nullable=False
    )

    contact_name = Column(
        String,
        nullable=True
    )

    website = Column(
        String,
        nullable=True
    )

    phone = Column(
        String,
        nullable=True
    )

    email = Column(
        String,
        nullable=True
    )

    source = Column(
        String,
        nullable=True
    )

    github_url = Column(
        String,
        nullable=True
    )

    twitter_url = Column(
        String,
        nullable=True
    )

    status = Column(
        Enum(LeadStatus),
        default=LeadStatus.FOUND
    )

    raw_data = Column(
        JSON
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    campaign = relationship(
        "Campaign",
        back_populates="leads"
    )

    research = relationship(
        "LeadResearch",
        back_populates="lead",
        uselist=False,
        cascade="all, delete-orphan"
    )