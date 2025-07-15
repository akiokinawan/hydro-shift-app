"""
認証・認可機能
JWTトークンを使用したユーザー認証と権限チェック
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
import os

from app.database import get_db
from app.models import User as UserModel

# JWT設定
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"

# OAuth2パスワードベアラー設定
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    JWTトークンから現在のユーザー情報を取得
    
    Args:
        token: JWTトークン
        db: データベースセッション
        
    Returns:
        UserModel: 認証されたユーザー
        
    Raises:
        HTTPException: 認証に失敗した場合
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が正しくありません",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # JWTトークンの検証
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # データベースからユーザー情報を取得
    user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_admin(current_user: UserModel = Depends(get_current_user)):
    """
    管理者権限を持つユーザーのみアクセス可能
    
    Args:
        current_user: 現在のユーザー
        
    Returns:
        UserModel: 管理者権限を持つユーザー
        
    Raises:
        HTTPException: 管理者権限がない場合
    """
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return current_user 