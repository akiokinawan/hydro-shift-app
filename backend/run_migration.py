#!/usr/bin/env python3
"""
マイグレーション実行スクリプト
"""

import os
import sys
from alembic.config import Config
from alembic import command

# プロジェクトルートをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_migration():
    """マイグレーションを実行"""
    print("マイグレーションを実行中...")
    
    # Alembic設定
    alembic_cfg = Config("alembic.ini")
    
    try:
        # 最新のマイグレーションまでアップグレード
        command.upgrade(alembic_cfg, "head")
        print("マイグレーション完了")
    except Exception as e:
        print(f"マイグレーションエラー: {e}")
        return False
    
    return True

if __name__ == "__main__":
    run_migration() 