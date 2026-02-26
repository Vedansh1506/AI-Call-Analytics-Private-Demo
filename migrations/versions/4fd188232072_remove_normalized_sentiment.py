"""remove normalized_sentiment

Revision ID: 4fd188232072
Revises: 70e9876593b6
Create Date: 2026-01-30 13:14:31.167951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4fd188232072'
down_revision: Union[str, Sequence[str], None] = '70e9876593b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import op

def upgrade():
    # Column already removed or never existed.
    pass

def downgrade():
    pass

