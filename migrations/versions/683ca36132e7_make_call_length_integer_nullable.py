"""make call_length integer nullable

Revision ID: 683ca36132e7
Revises: eb49f22cab94
Create Date: 2026-01-28 11:45:52.427781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '683ca36132e7'
down_revision: Union[str, Sequence[str], None] = 'eb49f22cab94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("""
        UPDATE asset_file
        SET call_length = '0'
        WHERE call_length IS NULL
           OR trim(call_length) = ''
           OR lower(trim(call_length)) = 'unknown'
           OR trim(call_length) !~ '^[0-9]+$';
    """)

    op.alter_column(
        'asset_file',
        'call_length',
        existing_type=sa.VARCHAR(),
        type_=sa.Integer(),
        postgresql_using='call_length::integer'
    )


    
def downgrade():
    op.alter_column(
        'asset_file',
        'call_length',
        existing_type=sa.Integer(),
        type_=sa.VARCHAR()
    )
