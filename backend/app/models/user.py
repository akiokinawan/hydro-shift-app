"""
ユーザーモデル
システムユーザーの情報を管理するデータベースモデル
"""

from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from .base import Base

class UserRole(enum.Enum):
    """ユーザー権限の列挙型"""
    ADMIN = "admin"  # 管理者
    USER = "user"    # 一般ユーザー

class User(Base):
    """ユーザーテーブルのモデル"""
    __tablename__ = "users"

    # 基本情報
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="ユーザー名")
    email = Column(String(255), unique=True, nullable=False, index=True, comment="メールアドレス")
    
    # 権限・認証
    role = Column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]), 
        default=UserRole.USER.value, 
        nullable=False,
        comment="ユーザー権限"
    )
    hashed_password = Column(String(255), nullable=False, server_default='', comment="ハッシュ化されたパスワード")
    
    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="作成日時")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新日時")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="論理削除日時")

    # リレーション
    fields = relationship("Field", back_populates="creator")
    schedules = relationship("Schedule", back_populates="user")
    histories = relationship("History", back_populates="user") 