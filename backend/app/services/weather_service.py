"""
天気サービス
OpenWeatherMap APIを使用した天気情報取得サービス
"""

import requests
from typing import Optional, List
import os
from datetime import datetime, timedelta

# OpenWeatherMap API エンドポイント
OPENWEATHERMAP_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHERMAP_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHERMAP_HISTORY_URL = "https://api.openweathermap.org/data/2.5/onecall/timemachine"

def get_weather_by_latlon(lat: float, lon: float, api_key: str) -> Optional[dict]:
    """
    現在の天気情報を取得（OpenWeatherMap）
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        
    Returns:
        dict: 天気情報、取得失敗時はNone
    """
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
        "lang": "ja"
    }
    try:
        resp = requests.get(OPENWEATHERMAP_URL, params=params, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[weather_service] 天気取得失敗: {e}")
        return None

def get_yesterday_weather(lat: float, lon: float, api_key: str) -> Optional[dict]:
    """
    前日の天気情報取得（OpenWeatherMap History API）
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        
    Returns:
        dict: 前日の天気情報、取得失敗時はNone
    """
    # 前日の日付を取得
    yesterday = datetime.now() - timedelta(days=1)
    yesterday_timestamp = int(yesterday.timestamp())
    
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
        "lang": "ja",
        "dt": yesterday_timestamp
    }
    try:
        resp = requests.get(OPENWEATHERMAP_HISTORY_URL, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return data
    except Exception as e:
        print(f"[weather_service] History API取得失敗: {e}")
        return None

def get_weather_forecast_by_latlon(lat: float, lon: float, api_key: str) -> Optional[List[dict]]:
    """
    5日間3時間ごと予報を取得（OpenWeatherMap）
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        
    Returns:
        List[dict]: 予報データ一覧、取得失敗時はNone
    """
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
        "lang": "ja"
    }
    try:
        resp = requests.get(OPENWEATHERMAP_FORECAST_URL, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return data.get("list", [])
    except Exception as e:
        print(f"[weather_service] 予報取得失敗: {e}")
        return None

def get_daily_rainfall(lat: float, lon: float, api_key: str, target_date: datetime = None) -> float:
    """
    指定日の累積降雨量を取得
    OpenWeatherMapの予報データから3時間ごとの降雨量を合計して計算
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        target_date: 対象日（デフォルトは今日）
        
    Returns:
        float: 累積降雨量（mm）
    """
    if target_date is None:
        target_date = datetime.now()
    
    # 予報データを取得
    forecast_data = get_weather_forecast_by_latlon(lat, lon, api_key)
    if not forecast_data:
        return 0.0
    
    # 指定日の降雨量を合計
    daily_rainfall = 0.0
    target_date_str = target_date.date().isoformat()
    
    for forecast in forecast_data:
        dt_txt = forecast.get("dt_txt")
        if dt_txt:
            forecast_date = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S")
            if forecast_date.date().isoformat() == target_date_str:
                # 3時間の降雨量を取得
                rain_3h = forecast.get("rain", {}).get("3h", 0.0) or 0.0
                daily_rainfall += rain_3h
    
    return daily_rainfall

def get_today_rainfall_until_now(lat: float, lon: float, api_key: str) -> float:
    """
    今日の累積降雨量を取得（現在時刻まで）
    過去の実績データと予報データを組み合わせて計算
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        
    Returns:
        float: 今日の累積降雨量（mm）
    """
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 予報データを取得
    forecast_data = get_weather_forecast_by_latlon(lat, lon, api_key)
    if not forecast_data:
        return 0.0
    
    total_rainfall = 0.0
    today_str = now.date().isoformat()
    
    for forecast in forecast_data:
        dt_txt = forecast.get("dt_txt")
        if dt_txt:
            forecast_time = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S")
            
            # 今日のデータのみ処理
            if forecast_time.date().isoformat() == today_str:
                # 現在時刻より前のデータのみカウント
                if forecast_time <= now:
                    rain_3h = forecast.get("rain", {}).get("3h", 0.0) or 0.0
                    total_rainfall += rain_3h
    
    return total_rainfall

def get_accurate_daily_rainfall(lat: float, lon: float, api_key: str) -> float:
    """
    その日の累積降雨量をより正確に取得
    History API（過去データ）と予報データを組み合わせて計算
    
    Args:
        lat: 緯度
        lon: 経度
        api_key: OpenWeatherMap APIキー
        
    Returns:
        float: その日の累積降雨量（mm）
    """
    now = datetime.now()
    today_str = now.date().isoformat()
    
    total_rainfall = 0.0
    
    # 1. 過去の実績データを取得（History API）
    # 今日の0時から現在時刻までの過去データを取得
    current_hour = now.hour
    
    for hour in range(0, current_hour, 3):  # 3時間ごとに取得
        if hour >= 24:
            break
            
        # その時刻のタイムスタンプを計算
        target_time = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        timestamp = int(target_time.timestamp())
        
        # History APIで過去データを取得
        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric",
            "lang": "ja",
            "dt": timestamp
        }
        
        try:
            resp = requests.get(OPENWEATHERMAP_HISTORY_URL, params=params, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if "hourly" in data and len(data["hourly"]) > 0:
                    # その時刻の降雨量を取得
                    hourly_data = data["hourly"][0]
                    rain_1h = hourly_data.get("rain", {}).get("1h", 0.0) or 0.0
                    total_rainfall += rain_1h
        except Exception as e:
            print(f"[get_accurate_daily_rainfall] History API取得失敗 (hour={hour}): {e}")
            continue
    
    # 2. 予報データから現在時刻以降のデータを取得
    forecast_data = get_weather_forecast_by_latlon(lat, lon, api_key)
    if forecast_data:
        for forecast in forecast_data:
            dt_txt = forecast.get("dt_txt")
            if dt_txt:
                forecast_time = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S")
                
                # 今日のデータで、現在時刻以降のもののみ処理
                if (forecast_time.date().isoformat() == today_str and 
                    forecast_time > now):
                    rain_3h = forecast.get("rain", {}).get("3h", 0.0) or 0.0
                    total_rainfall += rain_3h
    
    return total_rainfall 