"""
FastAPI アプリケーションのメインファイル
畑の水かけ当番管理システムのバックエンドAPI
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import DATABASE_URL
from app.api import schedules, histories, weather, users, fields, auth
from app.models import Base
from app.database import engine

# FastAPIアプリケーションのインスタンス作成
app = FastAPI(
    title="畑の水かけ当番管理API",
    description="畑の水かけ当番を管理するためのRESTful API",
    version="1.0.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アプリケーション起動時の処理
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時にデータベーステーブルを作成"""
    Base.metadata.create_all(bind=engine)

# ヘルスチェックエンドポイント
@app.get("/health/db")
def db_health_check():
    """データベース接続のヘルスチェック"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
    return {"db": result}

# APIルーターの登録
app.include_router(schedules.router)
app.include_router(histories.router)
app.include_router(weather.router)
app.include_router(users.router)
app.include_router(fields.router)
app.include_router(auth.router) 