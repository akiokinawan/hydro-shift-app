"""
畑管理API
畑のCRUD操作と画像管理を提供するAPIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import base64
import requests

from app.database import get_db
from app.models import Field as FieldModel, User as UserModel

router = APIRouter()

class FieldBase(BaseModel):
    """畑基本情報のモデル"""
    name: str
    location_text: str
    image: Optional[str] = None  # Base64文字列

class Field(FieldBase):
    """畑情報のレスポンスモデル"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FieldCreate(FieldBase):
    """畑作成リクエストのモデル"""
    pass

class FieldUpdate(BaseModel):
    """畑更新リクエストのモデル"""
    name: Optional[str] = None
    location_text: Optional[str] = None
    image: Optional[str] = None  # Base64文字列

def geocode_address(address: str) -> tuple[Optional[float], Optional[float]]:
    """
    住所から緯度経度を取得
    
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

def _convert_image_to_base64(image_bytes: Optional[bytes]) -> Optional[str]:
    """
    画像バイナリをBase64文字列に変換
    
    Args:
        image_bytes: 画像バイナリデータ
        
    Returns:
        str: Base64文字列、Noneの場合はNone
    """
    if image_bytes:
        return base64.b64encode(image_bytes).decode()
    return None

@router.get("/api/fields", response_model=List[Field])
def list_fields(db: Session = Depends(get_db)):
    """
    畑一覧を取得
    
    Args:
        db: データベースセッション
        
    Returns:
        List[Field]: 畑一覧
    """
    fields = db.query(FieldModel).all()
    result = []
    for f in fields:
        image_b64 = _convert_image_to_base64(f.image)
        result.append(Field(
            id=f.id,
            name=f.name,
            location_text=f.location_text,
            image=image_b64,
            created_by=f.created_by,
            created_at=f.created_at,
            updated_at=f.updated_at
        ))
    return result

@router.get("/api/fields/user/{user_id}", response_model=List[Field])
def get_user_fields(user_id: int, db: Session = Depends(get_db)):
    """
    指定ユーザーが作成した畑一覧を取得
    
    Args:
        user_id: ユーザーID
        db: データベースセッション
        
    Returns:
        List[Field]: ユーザーが作成した畑一覧
    """
    fields = db.query(FieldModel).filter(FieldModel.created_by == user_id).all()
    result = []
    for f in fields:
        image_b64 = _convert_image_to_base64(f.image)
        result.append(Field(
            id=f.id,
            name=f.name,
            location_text=f.location_text,
            image=image_b64,
            created_by=f.created_by,
            created_at=f.created_at,
            updated_at=f.updated_at
        ))
    return result

@router.get("/api/fields/{field_id}", response_model=Field)
def get_field(field_id: int, db: Session = Depends(get_db)):
    """
    特定の畑を取得
    
    Args:
        field_id: 畑ID
        db: データベースセッション
        
    Returns:
        Field: 畑情報
        
    Raises:
        HTTPException: 畑が見つからない場合
    """
    f = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if f is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    image_b64 = _convert_image_to_base64(f.image)
    return Field(
        id=f.id,
        name=f.name,
        location_text=f.location_text,
        image=image_b64,
        created_by=f.created_by,
        created_at=f.created_at,
        updated_at=f.updated_at
    )

@router.post("/api/fields", response_model=Field)
def create_field(field: FieldCreate, created_by: int, db: Session = Depends(get_db)):
    """
    畑を作成
    
    Args:
        field: 作成する畑情報
        created_by: 作成者ID
        db: データベースセッション
        
    Returns:
        Field: 作成された畑情報
        
    Raises:
        HTTPException: 作成者が見つからない場合、または同名の畑が既に存在する場合
    """
    # 作成者の存在確認
    user = db.query(UserModel).filter(UserModel.id == created_by).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 同じ名前の畑が既に存在するかチェック
    existing_field = db.query(FieldModel).filter(FieldModel.name == field.name).first()
    if existing_field:
        raise HTTPException(status_code=400, detail="Field with this name already exists")
    
    # 画像データの処理
    image_bytes = base64.b64decode(field.image) if field.image else None
    
    # 住所から緯度経度を取得
    lat, lon = geocode_address(field.location_text)
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="住所から緯度経度の取得に失敗しました")
    
    # 畑の作成
    db_field = FieldModel(
        name=field.name,
        location_text=field.location_text,
        latitude=lat,
        longitude=lon,
        image=image_bytes,
        created_by=created_by
    )
    
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    
    image_b64 = _convert_image_to_base64(db_field.image)
    return Field(
        id=db_field.id,
        name=db_field.name,
        location_text=db_field.location_text,
        image=image_b64,
        created_by=db_field.created_by,
        created_at=db_field.created_at,
        updated_at=db_field.updated_at
    )

@router.patch("/api/fields/{field_id}", response_model=Field)
def update_field(field_id: int, field_update: FieldUpdate, db: Session = Depends(get_db)):
    """
    畑を更新
    
    Args:
        field_id: 更新する畑ID
        field_update: 更新する畑情報
        db: データベースセッション
        
    Returns:
        Field: 更新された畑情報
        
    Raises:
        HTTPException: 畑が見つからない場合、または同名の畑が既に存在する場合
    """
    db_field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if db_field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # 名前の更新
    if field_update.name is not None:
        # 同じ名前の畑が既に存在するかチェック（自分以外）
        existing_field = db.query(FieldModel).filter(
            FieldModel.name == field_update.name,
            FieldModel.id != field_id
        ).first()
        if existing_field:
            raise HTTPException(status_code=400, detail="Field with this name already exists")
        db_field.name = field_update.name
    
    # 住所の更新
    if field_update.location_text is not None:
        db_field.location_text = field_update.location_text
        lat, lon = geocode_address(field_update.location_text)
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="住所から緯度経度の取得に失敗しました")
        db_field.latitude = lat
        db_field.longitude = lon
    
    # 画像の更新
    if field_update.image is not None:
        db_field.image = base64.b64decode(field_update.image)
    
    db.commit()
    db.refresh(db_field)
    
    image_b64 = _convert_image_to_base64(db_field.image)
    return Field(
        id=db_field.id,
        name=db_field.name,
        location_text=db_field.location_text,
        image=image_b64,
        created_by=db_field.created_by,
        created_at=db_field.created_at,
        updated_at=db_field.updated_at
    )

@router.delete("/api/fields/{field_id}")
def delete_field(field_id: int, db: Session = Depends(get_db)):
    """
    畑を削除
    
    Args:
        field_id: 削除する畑ID
        db: データベースセッション
        
    Returns:
        dict: 削除完了メッセージ
        
    Raises:
        HTTPException: 畑が見つからない場合
    """
    db_field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if db_field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    db.delete(db_field)
    db.commit()
    return {"message": "Field deleted successfully"}

@router.put("/api/fields/{field_id}/image")
def upload_field_image(field_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    画像ファイルをアップロードして保存
    
    Args:
        field_id: 畑ID
        file: アップロードする画像ファイル
        db: データベースセッション
        
    Returns:
        dict: アップロード完了メッセージ
        
    Raises:
        HTTPException: 畑が見つからない場合
    """
    db_field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if db_field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    
    content = file.file.read()
    db_field.image = content
    db.commit()
    return {"message": "Image uploaded successfully"}

@router.get("/api/fields/{field_id}/image")
def get_field_image(field_id: int, db: Session = Depends(get_db)):
    """
    画像バイナリを直接返す（imgタグsrcで利用可）
    
    Args:
        field_id: 畑ID
        db: データベースセッション
        
    Returns:
        Response: 画像バイナリレスポンス
        
    Raises:
        HTTPException: 畑または画像が見つからない場合
    """
    db_field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if db_field is None or not db_field.image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Content-Typeは仮にpng固定（必要に応じて判定可）
    return Response(content=db_field.image, media_type="image/png") 