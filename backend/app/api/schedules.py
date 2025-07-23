"""
スケジュール管理API
水かけ当番のスケジュール管理を提供するAPIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models import Schedule as ScheduleModel, User as UserModel, Field as FieldModel, ScheduleStatus, History as HistoryModel

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
    db: Session = Depends(get_db)
):
    """
    スケジュール一覧を取得
    
    Args:
        field_id: 畑ID（フィルタ用）
        month: 月指定（YYYY-MM形式）
        db: データベースセッション
        
    Returns:
        List[Schedule]: スケジュール一覧
    """
    query = db.query(ScheduleModel)
    
    # 畑IDでフィルタ
    if field_id:
        query = query.filter(ScheduleModel.field_id == field_id)
    
    # 月でフィルタ
    if month:
        # month形式: "2024-06" → その月のスケジュールを取得
        year, month_num = month.split("-")
        year = int(year)
        month_num = int(month_num)
        if month_num < 12:
            next_month = date(year, month_num + 1, 1)
        else:
            next_month = date(year + 1, 1, 1)
        query = query.filter(
            ScheduleModel.date >= date(year, month_num, 1),
            ScheduleModel.date < next_month
        )
    
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
def update_schedule(schedule_id: int, schedule_update: ScheduleUpdate, db: Session = Depends(get_db)):
    """
    スケジュールを更新
    
    Args:
        schedule_id: 更新するスケジュールID
        schedule_update: 更新するスケジュール情報
        db: データベースセッション
        
    Returns:
        Schedule: 更新されたスケジュール情報
        
    Raises:
        HTTPException: スケジュール、畑、またはユーザーが見つからない場合
    """
    db_schedule = db.query(ScheduleModel).filter(ScheduleModel.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
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
            print(f"DEBUG: Invalid status received: {schedule_update.status}")
            raise HTTPException(status_code=400, detail="Invalid status")
        print(f"DEBUG: Updating schedule status from {db_schedule.status} to {status_enum.value}")
        db_schedule.status = status_enum
    
    # コメントの更新
    if schedule_update.comment is not None:
        db_schedule.comment = schedule_update.comment
    
    db.commit()
    db.refresh(db_schedule)
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