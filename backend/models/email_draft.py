from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class EmailDraft(Base):
    __tablename__ = "email_drafts"

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

    subject = Column(
        String,
        nullable=True
    )

    body = Column(
        Text,
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
        backref="email_drafts"
    )
