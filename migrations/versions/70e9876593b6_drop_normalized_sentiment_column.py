"""drop normalized_sentiment column

Revision ID: 70e9876593b6
Revises: 875c9a5324ef
Create Date: 2026-01-30 10:52:51.758952

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70e9876593b6'
down_revision: Union[str, Sequence[str], None] = '875c9a5324ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.drop_column('api_responses', 'normalized_sentiment')

def downgrade():
    op.add_column(
        'api_responses',
        op.sa.Column('normalized_sentiment', op.sa.JSON(), nullable=True)
    )
