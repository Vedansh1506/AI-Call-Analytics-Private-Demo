"""add cascade deletes for user/assets/responses

Revision ID: b1a932152011
Revises: 81b82f7c9a7a
Create Date: 2026-02-24 10:45:59.429623

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1a932152011'
down_revision: Union[str, Sequence[str], None] = '70a856424f12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("api_responses") as batch_op:
        batch_op.drop_constraint("api_responses_asset_file_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "api_responses_asset_file_id_fkey",
            "asset_file",
            ["asset_file_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("asset_file") as batch_op:
        batch_op.drop_constraint("asset_file_user_auth_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "asset_file_user_auth_id_fkey",
            "auth_user",
            ["user_auth_id"],
            ["id"],
            ondelete="CASCADE",
        )

def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("asset_file") as batch_op:
        batch_op.drop_constraint("asset_file_user_auth_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "asset_file_user_auth_id_fkey",
            "auth_user",
            ["user_auth_id"],
            ["id"],
        )

    with op.batch_alter_table("api_responses") as batch_op:
        batch_op.drop_constraint("api_responses_asset_file_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "api_responses_asset_file_id_fkey",
            "asset_file",
            ["asset_file_id"],
            ["id"],
        )
