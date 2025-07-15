"""allow_null_schedule_id_in_histories

Revision ID: 9f1c88a6b65e
Revises: cd37a6573898
Create Date: 2025-07-12 00:49:10.787882

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f1c88a6b65e'
down_revision = 'cd37a6573898'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 履歴テーブルのschedule_idカラムをnullableに変更
    op.alter_column('histories', 'schedule_id',
                    existing_type=sa.Integer(),
                    nullable=True)


def downgrade() -> None:
    # 履歴テーブルのschedule_idカラムをnot nullableに戻す
    op.alter_column('histories', 'schedule_id',
                    existing_type=sa.Integer(),
                    nullable=False) 