"""add image column to fields

Revision ID: bbca17d56cf1
Revises: 0933cb849736
Create Date: 2025-07-11 21:21:19.468887

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bbca17d56cf1'
down_revision = '0933cb849736'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('fields', sa.Column('image', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column('fields', 'image') 