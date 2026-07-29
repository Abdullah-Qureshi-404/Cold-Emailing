from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    lead_id = Column(
        Integer,
        ForeignKey("leads.id"),
        nullable=False,
        index=True
    )

    email_draft_id = Column(
        Integer,
        ForeignKey("email_drafts.id"),
        nullable=True,
        index=True
    )

    gmail_thread_id = Column(
        String,
        nullable=True
    )

    sent_at = Column(
        DateTime,
        nullable=True
    )

    status = Column(
        String,
        default="pending"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    lead = relationship(
        "Lead",
        backref="email_logs"
    )

    email_draft = relationship(
        "EmailDraft",
        backref="email_logs"
    )
