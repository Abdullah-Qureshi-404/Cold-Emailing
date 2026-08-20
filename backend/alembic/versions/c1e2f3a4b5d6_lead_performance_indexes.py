"""lead performance indexes

Revision ID: c1e2f3a4b5d6
Revises: 0a0b03545610
Create Date: 2026-08-20 15:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1e2f3a4b5d6'
down_revision: Union[str, Sequence[str], None] = '0a0b03545610'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with performance composite indexes."""
    op.create_index('ix_leads_campaign_status', 'leads', ['campaign_id', 'status'], unique=False)
    op.create_index('ix_leads_campaign_created', 'leads', ['campaign_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_leads_campaign_created', table_name='leads')
    op.drop_index('ix_leads_campaign_status', table_name='leads')
