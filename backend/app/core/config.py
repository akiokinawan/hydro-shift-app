"""
アプリケーション設定
環境変数から設定値を読み込む
"""

import os

# データベース接続URL
# 環境変数から取得、デフォルトはDocker環境用の設定
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/postgres") 