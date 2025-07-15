"""
スケジュールモデル
水かけ当番のスケジュールを管理するデータベースモデル
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from .base import Base

class ScheduleStatus(enum.Enum):
    """スケジュール状態の列挙型"""
    PENDING = "未実施"   # 未実施
    COMPLETED = "完了"   # 完了

class Schedule(Base):
    """スケジュールテーブルのモデル"""
    __tablename__ = "schedules"
    
    # ユニーク制約：同じ畑・日付・ユーザーの組み合わせは一意
    __table_args__ = (
        UniqueConstraint('field_id', 'date', 'user_id', name='uq_field_date_user'),
    )

    # 基本情報
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False, comment="畑ID")
    date = Column(Date, nullable=False, comment="当番日")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="担当ユーザーID")
    
    # 状態・コメント
    status = Column(
        Enum(ScheduleStatus, values_callable=lambda x: [e.value for e in x]), 
        default=ScheduleStatus.PENDING.value, 
        nullable=False,
        comment="スケジュール状態"
    )
    comment = Column(String(500), nullable=True, comment="コメント")
    
    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="作成日時")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新日時")

    # リレーション
    field = relationship("Field", back_populates="schedules")
    user = relationship("User", back_populates="schedules")
    histories = relationship("History", back_populates="schedule") 