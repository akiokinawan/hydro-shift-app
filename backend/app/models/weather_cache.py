"""
天気情報キャッシュモデル
天気情報をキャッシュするためのデータベースモデル
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func

from .base import Base

class WeatherCache(Base):
    """天気情報キャッシュテーブルのモデル"""
    __tablename__ = "weather_cache"

    # 基本情報
    id = Column(Integer, primary_key=True, index=True)
    
    # キャッシュキー（緯度_経度_日付）
    cache_key = Column(String(100), nullable=False, unique=True, index=True, comment="キャッシュキー")
    
    # 天気情報（JSON文字列）
    weather_data = Column(Text, nullable=False, comment="天気情報（JSON文字列）")
    
    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="作成日時")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新日時") 