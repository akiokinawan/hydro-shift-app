"""
天気情報API
外部天気APIと連携して天気情報を提供するAPIエンドポイント
"""

import os
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import requests

from app.database import get_db
from app.models import Field as FieldModel
from app.services.weather_service import (
    get_weather_by_latlon, 
    get_weather_forecast_by_latlon, 
    get_yesterday_weather, 
    get_accurate_daily_rainfall
)
from app.services.weather_cache_service import get_cached_weather, set_cached_weather, clear_expired_cache, cleanup_cache

router = APIRouter()

def simplify_weather_description(description: str) -> str:
    """
    OpenWeatherMapの天気説明を簡潔な一言に変換
    
    Args:
        description: OpenWeatherMapの天気説明
        
    Returns:
        str: 簡潔な天気説明
    """
    weather_map = {
        # 晴れ系
        "晴れ": "晴れ",
        "晴天": "晴れ",
        "快晴": "晴れ",
        # 曇り系
        "曇り": "曇り",
        "薄い雲": "曇り",
        "厚い雲": "曇り",
        "雲": "曇り",
        # 雨系
        "雨": "雨",
        "小雨": "雨",
        "大雨": "雨",
        "にわか雨": "雨",
        "霧雨": "雨",
        "雷雨": "雷雨",
        "雷": "雷雨",
        # 雪系
        "雪": "雪",
        "小雪": "雪",
        "大雪": "雪",
        "みぞれ": "雪",
        # 霧・もや系
        "霧": "霧",
        "もや": "霧",
        # その他
        "不明": "不明"
    }
    
    # 完全一致を優先
    if description in weather_map:
        return weather_map[description]
    
    # 部分一致で判定
    for key, value in weather_map.items():
        if key in description:
            return value
    
    # デフォルト
    return "曇り" if "雲" in description else "晴れ"

class Weather(BaseModel):
    """天気情報のレスポンスモデル"""
    date: str
    weather: str
    rain_mm: float
    pop: Optional[float] = None  # 降水確率 (Probability of Precipitation)
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    icon: Optional[str] = None

def geocode_address(address: str) -> tuple[Optional[float], Optional[float]]:
    """
    住所から緯度経度を取得（Nominatim）
    
    Args:
        address: 住所文字列
        
    Returns:
        tuple: (緯度, 経度) 取得失敗時は (None, None)
    """
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={address}"
    try:
        resp = requests.get(url, timeout=5, headers={"User-Agent": "mizukake-toban-app"})
        resp.raise_for_status()
        data = resp.json()
        if data and len(data) > 0:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"[geocode_address] 住所→緯度経度変換失敗: {e}")
    return None, None

@router.get("/api/weather", response_model=Weather)
def get_weather(
    field_id: int = Query(...),
    date: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    指定された畑の天気情報を取得（外部API連携）
    """
    # 定期的に古いキャッシュを削除（確率ベースで実行）
    import random
    if random.random() < 0.05:  # 5%の確率で包括的クリーンアップ実行
        cleanup_result = cleanup_cache(
            db, 
            cache_duration_minutes=15, 
            days_to_keep=7, 
            max_cache_size=1000
        )
        print(f"[Weather Cache Cleanup] 削除されたキャッシュ: {cleanup_result}")
    
    # 畑の存在確認
    field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # 天気APIキーの取得
    api_key = os.environ.get("WEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail=f"Weather APIキー未設定:{api_key}")
    
    # DBに緯度・経度が保存されていればそれを使う。なければジオコーディングAPIを呼ぶ
    lat, lon = field.latitude, field.longitude
    if lat is None or lon is None:
        lat, lon = geocode_address(field.location_text)
        if lat is None or lon is None:
            raise HTTPException(status_code=502, detail="住所から緯度経度の取得に失敗しました")
    
    # キャッシュから天気情報を取得（15分間有効）
    cached_weather = get_cached_weather(db, lat, lon, date, cache_duration_minutes=15)
    if cached_weather:
        return Weather(**cached_weather)
    
    # 現在の天気データを取得
    current_weather = get_weather_by_latlon(lat, lon, api_key)
    if not current_weather:
        raise HTTPException(status_code=502, detail="外部天気API取得失敗")
    
    # 予報データを取得して今日の降水確率を取得
    forecast_data = get_weather_forecast_by_latlon(lat, lon, api_key)
    
    # 天気情報の抽出
    weather_raw = current_weather.get("weather", [{}])[0].get("description", "不明")
    weather = simplify_weather_description(weather_raw)
    
    # 今日の累積降雨量を取得（より正確な計算）
    current_rain_mm = get_accurate_daily_rainfall(lat, lon, api_key)
    
    # 今日の降水確率を取得（予報データから）
    pop = 0.0
    if forecast_data:
        today = datetime.now().date()
        for forecast in forecast_data:
            dt_txt = forecast.get("dt_txt")
            if dt_txt:
                forecast_date = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S").date()
                if forecast_date == today:
                    pop = forecast.get("pop", 0.0) * 100  # 0-1の値をパーセントに変換
                    break
    
    # その他の天気情報
    temperature = current_weather.get("main", {}).get("temp")
    humidity = current_weather.get("main", {}).get("humidity")
    icon = current_weather.get("weather", [{}])[0].get("icon")
    
    weather_response = Weather(
        date=date,
        weather=weather,
        rain_mm=current_rain_mm,
        pop=pop,
        temperature=temperature,
        humidity=humidity,
        icon=icon
    )
    
    # 天気情報をキャッシュに保存
    set_cached_weather(db, lat, lon, date, weather_response.dict())
    
    return weather_response

@router.get("/api/weather/forecast", response_model=list[Weather])
def get_weather_forecast(
    field_id: int = Query(...),
    days: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db)
):
    """
    指定された畑の天気予報を取得
    
    Args:
        field_id: 畑ID
        days: 予報日数（1-14日）
        db: データベースセッション
        
    Returns:
        list[Weather]: 天気予報一覧
        
    Raises:
        HTTPException: 畑が見つからない場合、または天気API取得に失敗した場合
    """
    # 畑の存在確認
    field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # 天気APIキーの確認
    if not field.weather_api_key:
        raise HTTPException(status_code=400, detail="Weather APIキー未設定")
    
    # 住所から緯度経度取得
    lat, lon = geocode_address(field.location_text)
    if lat is None or lon is None:
        raise HTTPException(status_code=502, detail="住所から緯度経度の取得に失敗しました")
    
    # 天気予報データを取得
    forecast_list = get_weather_forecast_by_latlon(lat, lon, field.weather_api_key)
    if not forecast_list:
        raise HTTPException(status_code=502, detail="外部天気API取得失敗")
    
    # 日付ごとに1件（昼12時）を抽出、最大days件返す
    result = []
    seen_dates = set()
    for item in forecast_list:
        dt_txt = item.get("dt_txt")
        if not dt_txt:
            continue
        
        dt = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S")
        date_str = dt.date().isoformat()
        
        if dt.hour == 12 and date_str not in seen_dates:
            weather_raw = item.get("weather", [{}])[0].get("description", "不明")
            weather = simplify_weather_description(weather_raw)
            
            result.append(Weather(
                date=date_str,
                weather=weather,
                rain_mm=item.get("rain", {}).get("3h", 0.0) or 0.0,
                temperature=item.get("main", {}).get("temp"),
                humidity=item.get("main", {}).get("humidity")
            ))
            seen_dates.add(date_str)
        
        if len(result) >= days:
            break
    
    return result 