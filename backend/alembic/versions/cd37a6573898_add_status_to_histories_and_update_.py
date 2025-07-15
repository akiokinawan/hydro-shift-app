"""add_status_to_histories_and_update_comment_length

Revision ID: cd37a6573898
Revises: dba9ddaafb0c
Create Date: 2025-07-12 00:27:54.888882

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cd37a6573898'
down_revision = 'dba9ddaafb0c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ヒストリーテーブルにstatusカラムを追加
    op.add_column('histories', sa.Column('status', sa.String(16), nullable=False, server_default='完了'))
    
    # コメントカラムの長さを300文字に変更
    op.alter_column('histories', 'comment',
                    existing_type=sa.String(500),
                    type_=sa.String(300),
                    existing_nullable=True)


def downgrade() -> None:
    # コメントカラムの長さを500文字に戻す
    op.alter_column('histories', 'comment',
                    existing_type=sa.String(300),
                    type_=sa.String(500),
                    existing_nullable=True)
    
    # statusカラムを削除
    op.drop_column('histories', 'status') 