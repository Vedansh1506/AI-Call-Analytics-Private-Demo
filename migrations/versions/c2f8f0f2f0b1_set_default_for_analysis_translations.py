"""set default for analysis_translations

Revision ID: c2f8f0f2f0b1
Revises: 705529bbc350
Create Date: 2026-02-27 13:45:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2f8f0f2f0b1"
down_revision: Union[str, Sequence[str], None] = "705529bbc350"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE api_responses SET analysis_translations='{}' WHERE analysis_translations IS NULL")
    op.alter_column(
        "api_responses",
        "analysis_translations",
        server_default=sa.text("'{}'::json"),
        existing_type=sa.JSON(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "api_responses",
        "analysis_translations",
        server_default=None,
        existing_type=sa.JSON(),
        existing_nullable=False,
    )

