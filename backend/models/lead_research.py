from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class LeadResearch(Base):
    __tablename__ = "lead_research"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    lead_id = Column(
        Integer,
        ForeignKey("leads.id"),
        nullable=False,
        unique=True,
        index=True
    )

    company_summary = Column(
        Text,
        nullable=True
    )

    company_description = Column(
        Text,
        nullable=True
    )

    technologies = Column(
        JSON,
        nullable=True
    )

    pain_points = Column(
        JSON,
        nullable=True
    )

    research_status = Column(
        String,
        default="completed"
    )

    confidence_score = Column(
        Integer,
        nullable=True
    )

    sources_used = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    lead = relationship(
        "Lead",
        back_populates="research"
    )
