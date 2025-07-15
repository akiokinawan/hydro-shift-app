"""
データベース設定とセッション管理
SQLAlchemyを使用したPostgreSQLデータベースの設定
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from app.core.config import DATABASE_URL

# データベースエンジンの作成
engine = create_engine(DATABASE_URL)

# セッションファクトリの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# データベースセッションの依存関係
def get_db():
    """
    FastAPIの依存関係注入で使用するデータベースセッション
    
    Yields:
        Session: SQLAlchemyセッション
        
    Note:
        セッションは自動的にクローズされる
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 