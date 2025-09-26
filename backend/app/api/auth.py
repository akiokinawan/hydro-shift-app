"""
認証API
ユーザーログイン・サインアップ機能を提供するAPIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
import jwt
import os

from app.database import get_db
from app.models import User as UserModel, UserRole
from passlib.context import CryptContext

# JWT設定
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24時間

# パスワードハッシュ化設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    パスワードの検証
    
    Args:
        plain_password: 平文パスワード
        hashed_password: ハッシュ化されたパスワード
        
    Returns:
        bool: パスワードが一致するかどうか
    """
    return pwd_context.verify(plain_password[:72], hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    JWTアクセストークンの作成
    
    Args:
        data: トークンに含めるデータ
        expires_delta: 有効期限（デフォルトは24時間）
        
    Returns:
        str: エンコードされたJWTトークン
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class SignupRequest(BaseModel):
    """サインアップリクエストのモデル"""
    name: str
    email: EmailStr
    password: str

@router.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    ユーザーログイン
    
    Args:
        form_data: ログインフォームデータ（メールアドレス、パスワード）
        db: データベースセッション
        
    Returns:
        dict: アクセストークンとユーザー情報
        
    Raises:
        HTTPException: 認証に失敗した場合
    """
    # ユーザーの存在確認
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーが存在しません")
    
    # パスワード認証
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="パスワードが違います")
    
    # アクセストークンの作成
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id, 
            "name": user.name, 
            "email": user.email, 
            "role": user.role.value
        }
    }

@router.post("/api/auth/signup")
def signup(signup_req: SignupRequest, db: Session = Depends(get_db)):
    """
    ユーザーサインアップ
    
    Args:
        signup_req: サインアップリクエスト
        db: データベースセッション
        
    Returns:
        dict: 作成されたユーザー情報
        
    Raises:
        HTTPException: メールアドレスが既に登録されている場合
    """
    # 既存のメールアドレスチェック
    existing_user = db.query(UserModel).filter(UserModel.email == signup_req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # パスワードハッシュ化 (72バイトに切り詰め)
    hashed_password = pwd_context.hash(signup_req.password[:72])
    
    # ユーザーの作成
    user = UserModel(
        name=signup_req.name,
        email=signup_req.email,
        role=UserRole.USER.value,
        hashed_password=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id, 
        "name": user.name, 
        "email": user.email, 
        "role": user.role.value
    } 