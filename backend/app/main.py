"""
FastAPI アプリケーションのメインファイル
畑の水かけ当番管理システムのバックエンドAPI
"""

import logging
from fastapi import FastAPI, Request # Requestを追加
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import DATABASE_URL
from app.api import schedules, histories, weather, users, fields, auth
from app.models import Base
from app.database import engine

# ロガーの設定
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# FastAPIアプリケーションのインスタンス作成
app = FastAPI(
    title="畑の水かけ当番管理API",
    description="畑の水かけ当番を管理するためのRESTful API",
    version="1.0.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        "https://hydro-shift-app.vercel.app"
    ],
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


# warmup用エンドポイント
@app.get("/api/warmup")
def warmup():
    """サーバーのコールドスタートを防ぐためのエンドポイント"""
    return {"status": "ok"}


@app.post("/webhook")
async def handle_webhook(request: Request):
    """
    LINEからのWebhookイベントを処理する一時的なエンドポイント
    グループIDを抽出するために使用
    """
    body = await request.json()
    logger.info(f"Received LINE Webhook event: {body}")

    # グループIDの抽出を試みる
    group_id = None
    for event in body.get("events", []):
        if event.get("source", {}).get("type") == "group":
            group_id = event["source"]["groupId"]
            logger.info(f"Extracted Group ID: {group_id}")
            break
    
    return {"status": "ok", "group_id": group_id}


# APIルーターの登録
app.include_router(schedules.router)
app.include_router(histories.router)
app.include_router(weather.router)
app.include_router(users.router)
app.include_router(fields.router)
app.include_router(auth.router) 