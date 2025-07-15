"""insert test data

Revision ID: 0002
Revises: 0001
Create Date: 2024-06-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, date

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # テストユーザーの投入
    op.execute("""
        INSERT INTO users (name, email, role, created_at) VALUES
        ('山田太郎', 'taro@example.com', 'admin', NOW()),
        ('佐藤花子', 'hanako@example.com', 'user', NOW())
    """)
    
    # テスト畑の投入
    op.execute("""
        INSERT INTO fields (name, location_text, latitude, longitude, weather_api_key, image_url, created_by, created_at) VALUES
        ('A圃場', '東京都○○区', 35.6, 139.7, NULL, 'https://example.com/field1.jpg', 1, NOW())
    """)
    
    # テストスケジュールの投入
    op.execute("""
        INSERT INTO schedules (field_id, date, user_id, status, comment, created_at) VALUES
        (1, '2024-06-10', 2, '未実施', '', NOW()),
        (1, '2024-06-11', 1, '未実施', '', NOW()),
        (1, '2024-06-12', 2, '未実施', '', NOW())
    """)
    
    # テスト履歴の投入
    op.execute("""
        INSERT INTO histories (schedule_id, user_id, executed_at, comment, created_at) VALUES
        (1, 2, '2024-06-10 08:00:00+09:00', '水かけ完了', NOW())
    """)


def downgrade() -> None:
    # テストデータの削除
    op.execute("DELETE FROM histories")
    op.execute("DELETE FROM schedules")
    op.execute("DELETE FROM fields")
    op.execute("DELETE FROM users") 