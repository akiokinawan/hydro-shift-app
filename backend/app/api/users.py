"""
ユーザー管理API
ユーザーのCRUD操作を提供するAPIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User as UserModel, UserRole
from app.core.auth import get_current_user, get_current_active_admin
from app.api.auth import pwd_context

router = APIRouter()

class UserBase(BaseModel):
    """ユーザー基本情報のモデル"""
    name: str
    email: str
    role: str

class User(UserBase):
    """ユーザー情報のレスポンスモデル"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserCreate(UserBase):
    """ユーザー作成リクエストのモデル"""
    password: str

class UserUpdate(BaseModel):
    """ユーザー更新リクエストのモデル"""
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

@router.get("/api/users", response_model=List[User])
def list_users(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_admin)):
    """
    ユーザー一覧を取得（管理者のみ）
    
    Args:
        db: データベースセッション
        current_user: 現在のユーザー（管理者権限必要）
        
    Returns:
        List[User]: ユーザー一覧
    """
    users = db.query(UserModel).all()
    return users

@router.get("/api/users/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    特定のユーザーを取得
    
    Args:
        user_id: ユーザーID
        db: データベースセッション
        
    Returns:
        User: ユーザー情報
        
    Raises:
        HTTPException: ユーザーが見つからない場合
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/api/users", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_admin)):
    """
    ユーザーを作成（管理者のみ）
    
    Args:
        user: 作成するユーザー情報
        db: データベースセッション
        current_user: 現在のユーザー（管理者権限必要）
        
    Returns:
        User: 作成されたユーザー情報
        
    Raises:
        HTTPException: メールアドレスが既に登録されている場合、または無効な権限の場合
    """
    # 既存のメールアドレスチェック
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 権限の検証
    role_enum = None
    for role in UserRole:
        if role.value == user.role:
            role_enum = role
            break
    if role_enum is None:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # パスワードハッシュ化
    hashed_password = pwd_context.hash(user.password)
    
    # ユーザーの作成
    db_user = UserModel(
        name=user.name,
        email=user.email,
        role=role_enum.value,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/api/users/{user_id}", response_model=User)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """
    ユーザー情報を更新
    
    Args:
        user_id: 更新するユーザーID
        user_update: 更新するユーザー情報
        db: データベースセッション
        
    Returns:
        User: 更新されたユーザー情報
        
    Raises:
        HTTPException: ユーザーが見つからない場合、またはメールアドレスが重複している場合
    """
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 名前の更新
    if user_update.name is not None:
        db_user.name = user_update.name
    
    # メールアドレスの更新
    if user_update.email is not None:
        # メールアドレスの重複チェック
        existing_user = db.query(UserModel).filter(
            UserModel.email == user_update.email,
            UserModel.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        db_user.email = user_update.email
    
    # 権限の更新
    if user_update.role is not None:
        role_enum = None
        for role in UserRole:
            if role.value == user_update.role:
                role_enum = role
                break
        
        if role_enum is None:
            raise HTTPException(status_code=400, detail="Invalid role")
        db_user.role = role_enum.value
    
    # パスワードの更新
    if user_update.password is not None:
        db_user.hashed_password = pwd_context.hash(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_admin)):
    """
    ユーザーを削除（管理者のみ）
    
    Args:
        user_id: 削除するユーザーID
        db: データベースセッション
        current_user: 現在のユーザー（管理者権限必要）
        
    Returns:
        dict: 削除完了メッセージ
        
    Raises:
        HTTPException: ユーザーが見つからない場合
    """
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"} 