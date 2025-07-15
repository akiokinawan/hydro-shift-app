"""
SQLAlchemy ベースモデル
すべてのモデルクラスの基底クラス
"""

from sqlalchemy.orm import declarative_base

# SQLAlchemyの宣言的ベースクラス
Base = declarative_base() 