"""
畑モデル
畑の情報を管理するデータベースモデル
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .base import Base

class Field(Base):
    """畑テーブルのモデル"""
    __tablename__ = "fields"

    # 基本情報
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="畑名")
    location_text = Column(String(255), nullable=False, comment="住所テキスト")
    
    # 位置情報
    latitude = Column(Float, nullable=True, comment="緯度")
    longitude = Column(Float, nullable=True, comment="経度")
    
    # 画像データ
    image = Column(LargeBinary, nullable=True, comment="畑の図面画像（バイナリ）")
    
    # 作成者情報
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, comment="作成者ID")
    
    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="作成日時")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新日時")

    # リレーション
    creator = relationship("User", back_populates="fields")
    schedules = relationship("Schedule", back_populates="field") 