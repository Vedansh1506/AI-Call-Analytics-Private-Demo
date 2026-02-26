"""add asset processing observability

Revision ID: 6af699736f75
Revises: 4fd188232072
Create Date: 2026-01-30 17:29:46.642839

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6af699736f75'
down_revision: Union[str, Sequence[str], None] = '4fd188232072'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("asset_file", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("asset_file", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("asset_file", sa.Column("processing_stage", sa.String(), nullable=True))
    op.add_column("asset_file", sa.Column("error_reason", sa.String(), nullable=True))



def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("asset_file", "error_reason")
    op.drop_column("asset_file", "processing_stage")
    op.drop_column("asset_file", "completed_at")
    op.drop_column("asset_file", "started_at")
    
