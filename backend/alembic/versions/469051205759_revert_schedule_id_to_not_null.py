"""revert_schedule_id_to_not_null

Revision ID: 469051205759
Revises: 9f1c88a6b65e
Create Date: 2025-07-12 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '469051205759'
down_revision = '9f1c88a6b65e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # schedule_idがnullの履歴レコードを削除
    op.execute("DELETE FROM histories WHERE schedule_id IS NULL")
    
    # 履歴テーブルのschedule_idカラムをNOT NULLに戻す
    op.alter_column('histories', 'schedule_id',
                    existing_type=sa.Integer(),
                    nullable=False)


def downgrade() -> None:
    # 履歴テーブルのschedule_idカラムをnullableに戻す
    op.alter_column('histories', 'schedule_id',
                    existing_type=sa.Integer(),
                    nullable=True) 