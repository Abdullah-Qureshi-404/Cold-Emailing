from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class CampaignStatus(enum.Enum):
    active = "active"
    paused = "paused"
    stopped = "stopped"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(String, nullable=False)

    name = Column(String, nullable=False)

    niche = Column(String, nullable=False)

    target_location = Column(String, nullable=False)

    service_description = Column(String, nullable=False)

    target_customer = Column(String, nullable=False)

    daily_limit = Column(Integer, default=50)

    status = Column(
        Enum(CampaignStatus),
        default=CampaignStatus.active
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


    leads = relationship(
        "Lead",
        back_populates="campaign"
    )