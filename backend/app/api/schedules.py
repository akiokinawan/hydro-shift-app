"""
スケジュール管理API
水かけ当番のスケジュール管理を提供するAPIエンドポイント
"""

import os
import requests
from fastapi import APIRouter, HTTPException, Depends, Query, Body, BackgroundTasks # BackgroundTasksを追加
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone

from app.database import get_db
from app.models import Schedule as ScheduleModel, User as UserModel, Field as FieldModel, ScheduleStatus, History as HistoryModel

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

class User(BaseModel):
    """ユーザー基本情報のモデル"""
    id: int
    name: str

    class Config:
        from_attributes = True

class Field(BaseModel):
    """畑基本情報のモデル"""
    id: int
    name: str

    class Config:
        from_attributes = True

class ScheduleBase(BaseModel):
    """スケジュール基本情報のモデル"""
    field_id: int
    date: date
    user_id: int
    status: str
    comment: Optional[str] = None

class Schedule(ScheduleBase):
    """スケジュール情報のレスポンスモデル"""
    id: int
    user: User
    field: Field
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ScheduleCreate(ScheduleBase):
    """スケジュール作成リクエストのモデル"""
    pass

class ScheduleUpdate(BaseModel):
    """スケジュール更新リクエストのモデル"""
    field_id: Optional[int] = None
    date: Optional[date] = None
    user_id: Optional[int] = None
    status: Optional[str] = None
    comment: Optional[str] = None

class DutyRequest(BaseModel):
    """当番登録・解除リクエストのモデル"""
    user_id: int
    field_id: int
    date: date
    action: str  # 'register' or 'unregister'

@router.get("/api/schedules", response_model=List[Schedule])
def get_schedules(
    field_id: Optional[int] = Query(None),
    month: Optional[str] = Query(None),
    day: Optional[str] = Query(None), # dayパラメータを追加
    db: Session = Depends(get_db)
):
    """
    スケジュール一覧を取得
    
    Args:
        field_id: 畑ID（フィルタ用）
        month: 月指定（YYYY-MM形式）
        day: 日付指定 (YYYY-MM-DD形式)
        db: データベースセッション
        
    Returns:
        List[Schedule]: スケジュール一覧
    """
    query = db.query(ScheduleModel)
    
    # 畑IDでフィルタ
    if field_id:
        query = query.filter(ScheduleModel.field_id == field_id)
    
    if day:
        # dayが指定されている場合は、その日付でフィルタ
        try:
            target_date = datetime.strptime(day, "%Y-%m-%d").date()
            query = query.filter(ScheduleModel.date == target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format for day. Use YYYY-MM-DD.")
    elif month:
        # month形式: "2024-06" → その月のスケジュールを取得
        try:
            year, month_num = map(int, month.split("-"))
            start_date = date(year, month_num, 1)
            if month_num < 12:
                end_date = date(year, month_num + 1, 1)
            else:
                end_date = date(year + 1, 1, 1)
            query = query.filter(
                ScheduleModel.date >= start_date,
                ScheduleModel.date < end_date
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")

    schedules = query.all()
    return schedules

@router.get("/api/schedules/{schedule_id}", response_model=Schedule)
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """
    特定のスケジュールを取得
    
    Args:
        schedule_id: スケジュールID
        db: データベースセッション
        
    Returns:
        Schedule: スケジュール情報
        
    Raises:
        HTTPException: スケジュールが見つからない場合
    """
    schedule = db.query(ScheduleModel).filter(ScheduleModel.id == schedule_id).first()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@router.post("/api/schedules", response_model=Schedule)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db)):
    """
    スケジュールを作成
    
    Args:
        schedule: 作成するスケジュール情報
        db: データベースセッション
        
    Returns:
        Schedule: 作成されたスケジュール情報
        
    Raises:
        HTTPException: 畑またはユーザーが見つからない場合、または既にスケジュールが存在する場合
    """
    # 畑の存在確認
    field = db.query(FieldModel).filter(FieldModel.id == schedule.field_id).first()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # ユーザーの存在確認
    user = db.query(UserModel).filter(UserModel.id == schedule.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 状態の検証
    status_enum = None
    for status in ScheduleStatus:
        if status.value == schedule.status:
            status_enum = status
            break
    
    if status_enum is None:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # 同じ日付・畑のスケジュールが既に存在するかチェック
    existing_schedule = db.query(ScheduleModel).filter(
        ScheduleModel.field_id == schedule.field_id,
        ScheduleModel.date == schedule.date
    ).first()
    
    if existing_schedule:
        raise HTTPException(status_code=400, detail="Schedule already exists for this field and date")
    
    # スケジュールの作成
    db_schedule = ScheduleModel(
        field_id=schedule.field_id,
        date=schedule.date,
        user_id=schedule.user_id,
        status=status_enum,
        comment=schedule.comment
    )
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.patch("/api/schedules/{schedule_id}", response_model=Schedule)
def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    background_tasks: BackgroundTasks, # BackgroundTasksを追加
    db: Session = Depends(get_db)
):
    """
    スケジュールを更新
    """
    db_schedule = db.query(ScheduleModel).filter(ScheduleModel.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # 変更前のステータスを保存
    old_status = db_schedule.status.value if db_schedule.status else None # Enumから値を取得

    # 畑IDの更新
    if schedule_update.field_id is not None:
        field = db.query(FieldModel).filter(FieldModel.id == schedule_update.field_id).first()
        if field is None:
            raise HTTPException(status_code=404, detail="Field not found")
        db_schedule.field_id = schedule_update.field_id
    
    # 日付の更新
    if schedule_update.date is not None:
        db_schedule.date = schedule_update.date
    
    # ユーザーIDの更新
    if schedule_update.user_id is not None:
        user = db.query(UserModel).filter(UserModel.id == schedule_update.user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        db_schedule.user_id = schedule_update.user_id
    
    # 状態の更新
    if schedule_update.status is not None:
        status_enum = None
        for status in ScheduleStatus:
            if status.value == schedule_update.status:
                status_enum = status
                break
        
        if status_enum is None:
            raise HTTPException(status_code=400, detail="Invalid status")
        db_schedule.status = status_enum
    
    # コメントの更新
    if schedule_update.comment is not None:
        db_schedule.comment = schedule_update.comment
    
    db.commit()
    db.refresh(db_schedule)

    # ステータスが変更され、「完了」または「スキップ」になった場合にLINE通知を送信
    if schedule_update.status and schedule_update.status != old_status and schedule_update.status in ["完了", "スキップ"]:
        user = db.query(UserModel).filter(UserModel.id == db_schedule.user_id).first()
        field = db.query(FieldModel).filter(FieldModel.id == db_schedule.field_id).first()
        
        user_name = user.name if user else "不明なユーザー"
        field_name = field.name if field else "不明な畑"

        # 日本時間 (UTC+9)
        JST = timezone(timedelta(hours=9))
        now_jst = datetime.now(JST).strftime("%Y-%m-%d %H:%M")
        
        # 当番の日付をフォーマット
        duty_date = db_schedule.date.strftime("%Y-%m-%d")

        # コメントがない場合のデフォルトメッセージ
        comment_text = db_schedule.comment if db_schedule.comment else "コメントはありません"

        # メッセージ本文を作成
        message_lines = [
            "- - - - - - - - - - -",
            "【水やり当番 報告】",
            "- - - - - - - - - - -",
            f"🗓️ 日付：{duty_date}",
            f"担当：{user_name}",
            "📝 コメント：",
            comment_text,
            ""
        ]
        message = "\n".join(message_lines)
        
        if LINE_GROUP_ID: # グループIDが設定されている場合のみ通知
            background_tasks.add_task(send_line_notification, LINE_GROUP_ID, message)
        else:
            print("LINE_GROUP_ID is not set, skipping LINE notification.")

    return db_schedule

@router.delete("/api/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """
    スケジュールを削除
    
    Args:
        schedule_id: 削除するスケジュールID
        db: データベースセッション
        
    Returns:
        dict: 削除完了メッセージ
        
    Raises:
        HTTPException: スケジュールが見つからない場合
    """
    db_schedule = db.query(ScheduleModel).filter(ScheduleModel.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    return {"message": "Schedule deleted successfully"}

@router.post("/api/schedules/duty")
def register_or_unregister_duty(
    req: DutyRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    ユーザー自身による水かけ当番の登録・解除
    
    Args:
        req: 当番登録・解除リクエスト
        db: データベースセッション
        
    Returns:
        dict: 登録・解除結果
        
    Raises:
        HTTPException: 無効なアクション、ユーザー・畑が見つからない場合、または既に登録済みの場合
    """
    if req.action not in ("register", "unregister"):
        raise HTTPException(status_code=400, detail="Invalid action")

    # ユーザー・畑存在チェック
    user = db.query(UserModel).filter(UserModel.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    field = db.query(FieldModel).filter(FieldModel.id == req.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # 既存スケジュール取得
    schedule = db.query(ScheduleModel).filter(
        ScheduleModel.field_id == req.field_id,
        ScheduleModel.date == req.date,
        ScheduleModel.user_id == req.user_id
    ).first()

    if req.action == "register":
        if schedule:
            raise HTTPException(status_code=400, detail="Already registered")
        
        # 新規登録
        db_schedule = ScheduleModel(
            field_id=req.field_id,
            date=req.date,
            user_id=req.user_id,
            status=ScheduleStatus.PENDING,
        )
        db.add(db_schedule)
        db.commit()
        db.refresh(db_schedule)
        return {"result": "registered", "schedule_id": db_schedule.id}
    else:  # unregister
        if not schedule:
            raise HTTPException(status_code=404, detail="Not registered")
        
        # 関連する履歴を削除
        histories = db.query(HistoryModel).filter(HistoryModel.schedule_id == schedule.id).all()
        for history in histories:
            db.delete(history)
        
        # スケジュールを削除
        db.delete(schedule)
        db.commit()
        return {"result": "unregistered"} 