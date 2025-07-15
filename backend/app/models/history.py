"""
履歴モデル
水かけ実行履歴を管理するデータベースモデル
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .base import Base

class History(Base):
    """履歴テーブルのモデル"""
    __tablename__ = "histories"

    # 基本情報
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, comment="スケジュールID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="実行ユーザーID")
    
    # 実行情報
    executed_at = Column(DateTime(timezone=True), nullable=False, comment="実行日時")
    status = Column(String(16), nullable=False, default='完了', comment="実行状態")
    comment = Column(String(300), nullable=True, comment="実行コメント")
    
    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="作成日時")

    # リレーション
    schedule = relationship("Schedule", back_populates="histories")
    user = relationship("User", back_populates="histories") 