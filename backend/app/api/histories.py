"""
履歴管理API
水かけ実行履歴の管理を提供するAPIエンドポイント
"""

import os
import requests
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks # BackgroundTasksを追加
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import History as HistoryModel, Schedule as ScheduleModel, User as UserModel # ScheduleModel, UserModelも必要

# LINE Messaging API設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_GROUP_ID = os.getenv("LINE_GROUP_ID") # 環境変数からグループIDを取得

# LINE通知を送信する関数
def send_line_notification(group_id: str, message: str):
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print("LINE_CHANNEL_ACCESS_TOKEN is not set.")
        return
    if not group_id:
        print("LINE_GROUP_ID is not set.")
        return

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "to": group_id,
        "messages": [
            {
                "type": "text",
                "text": message
            }
        ]
    }
    try:
        response = requests.post("https://api.line.me/v2/bot/message/push", headers=headers, json=payload)
        response.raise_for_status() # HTTPエラーがあれば例外を発生させる
        print(f"LINE notification sent successfully: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to send LINE notification: {e}")


router = APIRouter()

class HistoryBase(BaseModel):
    """履歴基本情報のモデル"""
    schedule_id: int
    user_id: int
    executed_at: datetime
    status: str = '完了'
    comment: Optional[str] = Field(None, max_length=300)

class History(HistoryBase):
    """履歴情報のレスポンスモデル"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class HistoryCreate(HistoryBase):
    """履歴作成リクエストのモデル"""
    pass

class HistoryUpdate(BaseModel):
    """履歴更新リクエストのモデル"""
    executed_at: Optional[datetime] = None
    status: Optional[str] = None
    comment: Optional[str] = Field(None, max_length=300)

class HistoryWithUserName(HistoryBase):
    """ユーザー名付き履歴情報のモデル"""
    id: int
    created_at: datetime
    user_name: str

    class Config:
        orm_mode = True

@router.get("/api/histories", response_model=List[HistoryWithUserName])
def list_histories(
    schedule_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    履歴一覧を取得（ユーザー名付き）
    
    Args:
        schedule_id: スケジュールID（フィルタ用）
        user_id: ユーザーID（フィルタ用）
        db: データベースセッション
        
    Returns:
        List[HistoryWithUserName]: 履歴一覧（ユーザー名付き）
    """
    query = db.query(HistoryModel)
    
    # スケジュールIDでフィルタ
    if schedule_id:
        query = query.filter(HistoryModel.schedule_id == schedule_id)
    
    # ユーザーIDでフィルタ
    if user_id:
        query = query.filter(HistoryModel.user_id == user_id)
    
    # 実行日時の降順で取得
    histories = query.order_by(HistoryModel.executed_at.desc()).all()
    
    # ユーザー名を付与
    result = []
    for h in histories:
        user = db.query(UserModel).filter(UserModel.id == h.user_id).first()
        user_name = user.name if user else f"ID:{h.user_id}"
        result.append({
            **h.__dict__,
            'user_name': user_name,
        })
    return result

@router.get("/api/histories/{history_id}", response_model=History)
def get_history(history_id: int, db: Session = Depends(get_db)):
    """
    特定の履歴を取得
    
    Args:
        history_id: 履歴ID
        db: データベースセッション
        
    Returns:
        History: 履歴情報
        
    Raises:
        HTTPException: 履歴が見つからない場合
    """
    history = db.query(HistoryModel).filter(HistoryModel.id == history_id).first()
    if history is None:
        raise HTTPException(status_code=404, detail="History not found")
    return history

@router.post("/api/histories", response_model=History)
def create_history(history: HistoryCreate, db: Session = Depends(get_db)):
    """
    履歴を作成
    
    Args:
        history: 作成する履歴情報
        db: データベースセッション
        
    Returns:
        History: 作成された履歴情報
        
    Raises:
        HTTPException: スケジュールまたはユーザーが見つからない場合、または既に履歴が存在する場合
    """
    # スケジュールの存在確認
    schedule = db.query(ScheduleModel).filter(ScheduleModel.id == history.schedule_id).first()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # ユーザーの存在確認
    user = db.query(UserModel).filter(UserModel.id == history.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 同じスケジュールの履歴が既に存在するかチェック
    existing_history = db.query(HistoryModel).filter(
        HistoryModel.schedule_id == history.schedule_id
    ).first()
    
    if existing_history:
        raise HTTPException(status_code=400, detail="History already exists for this schedule")
    
    # 履歴の作成
    db_history = HistoryModel(
        schedule_id=history.schedule_id,
        user_id=history.user_id,
        executed_at=history.executed_at,
        status=history.status,
        comment=history.comment
    )
    
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

@router.patch("/api/histories/{history_id}", response_model=History)
def update_history(
    history_id: int,
    history_update: HistoryUpdate,
    background_tasks: BackgroundTasks, # BackgroundTasksを追加
    db: Session = Depends(get_db)
):
    """
    履歴を更新
    """
    db_history = db.query(HistoryModel).filter(HistoryModel.id == history_id).first()
    if db_history is None:
        raise HTTPException(status_code=404, detail="History not found")
    
    # 変更前のステータスを保存
    old_status = db_history.status

    # 実行日時の更新
    if history_update.executed_at is not None:
        db_history.executed_at = history_update.executed_at
    
    # 状態の更新
    if history_update.status is not None:
        db_history.status = history_update.status
    
    # コメントの更新
    if history_update.comment is not None:
        db_history.comment = history_update.comment
    
    db.commit()
    db.refresh(db_history)

    # ステータスが変更され、「完了」または「スキップ」になった場合にLINE通知を送信
    if history_update.status and history_update.status != old_status and history_update.status in ["完了", "スキップ"]:
        user = db.query(UserModel).filter(UserModel.id == db_history.user_id).first()
        # schedule = db.query(ScheduleModel).filter(ScheduleModel.id == db_history.schedule_id).first() # 畑名取得のため

        user_name = user.name if user else "不明なユーザー"
        # field_name = schedule.field.name if schedule and schedule.field else "不明な畑" # 畑名取得は後回し

        message = f"{user_name}さんが水やりを「{history_update.status}」しました！" # 畑名なしのメッセージ
        
        if LINE_GROUP_ID: # グループIDが設定されている場合のみ通知
            background_tasks.add_task(send_line_notification, LINE_GROUP_ID, message)
        else:
            print("LINE_GROUP_ID is not set, skipping LINE notification.")

    return db_history

@router.delete("/api/histories/{history_id}")
def delete_history(history_id: int, db: Session = Depends(get_db)):
    """
    履歴を削除
    
    Args:
        history_id: 削除する履歴ID
        db: データベースセッション
        
    Returns:
        dict: 削除完了メッセージ
        
    Raises:
        HTTPException: 履歴が見つからない場合
    """
    db_history = db.query(HistoryModel).filter(HistoryModel.id == history_id).first()
    if db_history is None:
        raise HTTPException(status_code=404, detail="History not found")
    
    db.delete(db_history)
    db.commit()
    return {"message": "History deleted successfully"} 