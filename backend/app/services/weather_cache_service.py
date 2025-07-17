"""
天気情報キャッシュサービス
天気情報のキャッシュ管理を行うサービス
"""

import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import WeatherCache

def generate_cache_key(lat: float, lon: float, date: str) -> str:
    """
    キャッシュキーを生成
    
    Args:
        lat: 緯度
        lon: 経度
        date: 日付（YYYY-MM-DD形式）
        
    Returns:
        str: キャッシュキー
    """
    return f"{lat}_{lon}_{date}"

def get_cached_weather(db: Session, lat: float, lon: float, date: str, cache_duration_minutes: int = 15) -> Optional[Dict[str, Any]]:
    """
    キャッシュされた天気情報を取得
    
    Args:
        db: データベースセッション
        lat: 緯度
        lon: 経度
        date: 日付
        cache_duration_minutes: キャッシュ有効期間（分）
        
    Returns:
        Optional[Dict[str, Any]]: キャッシュされた天気情報、有効期限切れまたは存在しない場合はNone
    """
    cache_key = generate_cache_key(lat, lon, date)
    
    # キャッシュレコードを取得
    cache_record = db.query(WeatherCache).filter(WeatherCache.cache_key == cache_key).first()
    
    if not cache_record:
        return None
    
    # キャッシュの有効期限をチェック
    cache_age = datetime.now(cache_record.created_at.tzinfo) - cache_record.created_at
    if cache_age > timedelta(minutes=cache_duration_minutes):
        # 有効期限切れのキャッシュを削除
        db.delete(cache_record)
        db.commit()
        return None
    
    # キャッシュされたデータを返す
    try:
        return json.loads(cache_record.weather_data)
    except json.JSONDecodeError:
        # JSONデコードエラーの場合、キャッシュを削除
        db.delete(cache_record)
        db.commit()
        return None

def set_cached_weather(db: Session, lat: float, lon: float, date: str, weather_data: Dict[str, Any]) -> None:
    """
    天気情報をキャッシュに保存
    
    Args:
        db: データベースセッション
        lat: 緯度
        lon: 経度
        date: 日付
        weather_data: 天気情報データ
    """
    cache_key = generate_cache_key(lat, lon, date)
    
    # 既存のキャッシュを削除（upsert）
    existing_cache = db.query(WeatherCache).filter(WeatherCache.cache_key == cache_key).first()
    if existing_cache:
        db.delete(existing_cache)
    
    # 新しいキャッシュを作成
    cache_record = WeatherCache(
        cache_key=cache_key,
        weather_data=json.dumps(weather_data, ensure_ascii=False)
    )
    
    db.add(cache_record)
    db.commit()

def clear_expired_cache(db: Session, cache_duration_minutes: int = 15) -> int:
    """
    有効期限切れのキャッシュを削除
    
    Args:
        db: データベースセッション
        cache_duration_minutes: キャッシュ有効期間（分）
        
    Returns:
        int: 削除されたキャッシュ数
    """
    cutoff_time = datetime.now() - timedelta(minutes=cache_duration_minutes)
    
    expired_caches = db.query(WeatherCache).filter(
        WeatherCache.created_at < cutoff_time
    ).all()
    
    count = len(expired_caches)
    for cache in expired_caches:
        db.delete(cache)
    
    db.commit()
    return count

def clear_old_date_cache(db: Session, days_to_keep: int = 7) -> int:
    """
    古い日付のキャッシュを削除
    
    Args:
        db: データベースセッション
        days_to_keep: 保持する日数
        
    Returns:
        int: 削除されたキャッシュ数
    """
    cutoff_date = datetime.now().date() - timedelta(days=days_to_keep)
    
    old_caches = db.query(WeatherCache).filter(
        WeatherCache.created_at < cutoff_date
    ).all()
    
    count = len(old_caches)
    for cache in old_caches:
        db.delete(cache)
    
    db.commit()
    return count

def limit_cache_size(db: Session, max_cache_size: int = 1000) -> int:
    """
    キャッシュサイズを制限する（古いものから削除）
    
    Args:
        db: データベースセッション
        max_cache_size: 最大キャッシュ数
        
    Returns:
        int: 削除されたキャッシュ数
    """
    total_caches = db.query(WeatherCache).count()
    
    if total_caches <= max_cache_size:
        return 0
    
    # 古いものから削除
    caches_to_delete = db.query(WeatherCache).order_by(
        WeatherCache.created_at.asc()
    ).limit(total_caches - max_cache_size).all()
    
    count = len(caches_to_delete)
    for cache in caches_to_delete:
        db.delete(cache)
    
    db.commit()
    return count

def cleanup_cache(db: Session, cache_duration_minutes: int = 15, days_to_keep: int = 7, max_cache_size: int = 1000) -> Dict[str, int]:
    """
    包括的なキャッシュクリーンアップを実行
    
    Args:
        db: データベースセッション
        cache_duration_minutes: キャッシュ有効期間（分）
        days_to_keep: 保持する日数
        max_cache_size: 最大キャッシュ数
        
    Returns:
        Dict[str, int]: 削除されたキャッシュ数の詳細
    """
    expired_count = clear_expired_cache(db, cache_duration_minutes)
    old_date_count = clear_old_date_cache(db, days_to_keep)
    size_limit_count = limit_cache_size(db, max_cache_size)
    
    return {
        "expired": expired_count,
        "old_date": old_date_count,
        "size_limit": size_limit_count,
        "total": expired_count + old_date_count + size_limit_count
    } 