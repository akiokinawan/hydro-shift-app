"""add latitude and longitude columns to fields

Revision ID: fe12cde55d40
Revises: 0004
Create Date: 2025-07-14 01:49:35.773597

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fe12cde55d40'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('fields', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('fields', sa.Column('longitude', sa.Float(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_column('fields', 'latitude')
    op.drop_column('fields', 'longitude')
    # ### end Alembic commands ### 