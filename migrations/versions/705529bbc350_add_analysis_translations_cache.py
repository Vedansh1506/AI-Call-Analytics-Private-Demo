"""add analysis translations cache

Revision ID: 705529bbc350
Revises: ed1637548c5e
Create Date: 2026-02-27 12:20:44.343568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '705529bbc350'
down_revision: Union[str, Sequence[str], None] = 'ed1637548c5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("api_responses", sa.Column("analysis_translations", sa.JSON(), nullable=True))
    op.execute("UPDATE api_responses SET analysis_translations='{}' WHERE analysis_translations IS NULL")
    op.alter_column("api_responses", "analysis_translations", nullable=False)



def downgrade() -> None:
    op.drop_column("api_responses", "analysis_translations")

