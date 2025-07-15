#!/usr/bin/env python3
"""
初期データ投入スクリプト
JSONファイルからデータベースに初期データを投入します
"""

import json
import os
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from typing import Optional

# プロジェクトルートをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Field, Schedule, History, ScheduleStatus, UserRole
from app.core.config import DATABASE_URL

def load_json_data(file_path: str) -> Optional[list]:
    """
    JSONファイルを読み込む
    
    Args:
        file_path: JSONファイルのパス
        
    Returns:
        list: JSONデータ、読み込み失敗時はNone
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません: {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"エラー: JSONの解析に失敗しました: {file_path} - {e}")
        return None

def create_session():
    """
    データベースセッションを作成
    
    Returns:
        Session: SQLAlchemyセッション
    """
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def seed_users(session, data_dir: str) -> bool:
    """
    ユーザーデータを投入
    
    Args:
        session: データベースセッション
        data_dir: データディレクトリのパス
        
    Returns:
        bool: 成功時はTrue、失敗時はFalse
    """
    print("ユーザーデータを投入中...")
    users_data = load_json_data(os.path.join(data_dir, "users.json"))
    if not users_data:
        return False
    
    for user_data in users_data:
        try:
            # created_atをdatetimeオブジェクトに変換
            created_at = datetime.fromisoformat(user_data["created_at"].replace("Z", "+00:00"))
            
            # 権限の検証
            role_enum = None
            for role in UserRole:
                if role.value == user_data['role']:
                    role_enum = role
                    break
            
            if role_enum is None:
                print(f"  エラー: 無効なrole値: {user_data['role']}")
                continue
            
            # ユーザーの作成
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                role=role_enum,
                created_at=created_at
            )
            session.add(user)
            session.commit()
            print(f"  ユーザー追加: {user.name}")
        except IntegrityError:
            print(f"  ユーザー既存: {user_data['name']}")
            session.rollback()
        except Exception as e:
            print(f"  エラー: {user_data['name']} - {e}")
            session.rollback()
    
    print("ユーザーデータ投入完了")
    return True

def load_image_binary(image_path: str) -> Optional[bytes]:
    """
    画像ファイルをバイナリデータとして読み込む
    
    Args:
        image_path: 画像ファイルのパス
        
    Returns:
        bytes: 画像バイナリデータ、読み込み失敗時はNone
    """
    try:
        if image_path and os.path.exists(image_path):
            with open(image_path, 'rb') as f:
                return f.read()
        return None
    except Exception as e:
        print(f"  警告: 画像ファイルの読み込みに失敗: {image_path} - {e}")
        return None

def seed_fields(session, data_dir: str) -> bool:
    """
    畑データを投入
    
    Args:
        session: データベースセッション
        data_dir: データディレクトリのパス
        
    Returns:
        bool: 成功時はTrue、失敗時はFalse
    """
    print("畑データを投入中...")
    fields_data = load_json_data(os.path.join(data_dir, "fields.json"))
    if not fields_data:
        return False
    
    images_dir = os.path.join(data_dir, "images")
    
    for field_data in fields_data:
        try:
            # 日時をdatetimeオブジェクトに変換
            created_at = datetime.fromisoformat(field_data["created_at"].replace("Z", "+00:00"))
            updated_at = datetime.fromisoformat(field_data["updated_at"].replace("Z", "+00:00"))
            
            # 画像ファイルをバイナリデータとして読み込み
            image_binary = None
            if field_data.get("image"):
                image_path = os.path.join(images_dir, field_data["image"])
                image_binary = load_image_binary(image_path)
            
            # 畑の作成
            field = Field(
                name=field_data["name"],
                location_text=field_data["location_text"],
                latitude=field_data.get("latitude"),
                longitude=field_data.get("longitude"),
                image=image_binary,
                created_by=field_data["created_by"],
                created_at=created_at,
                updated_at=updated_at
            )
            session.add(field)
            session.commit()
            print(f"  畑追加: {field.name}")
        except IntegrityError:
            print(f"  畑既存: {field_data['name']}")
            session.rollback()
        except Exception as e:
            print(f"  エラー: {field_data['name']} - {e}")
            session.rollback()
    
    print("畑データ投入完了")
    return True

def seed_schedules(session, data_dir: str) -> bool:
    """
    スケジュールデータを投入
    
    Args:
        session: データベースセッション
        data_dir: データディレクトリのパス
        
    Returns:
        bool: 成功時はTrue、失敗時はFalse
    """
    print("スケジュールデータを投入中...")
    schedules_data = load_json_data(os.path.join(data_dir, "schedules.json"))
    if not schedules_data:
        return False
    
    for schedule_data in schedules_data:
        try:
            # 日付と日時を適切なオブジェクトに変換
            date = datetime.strptime(schedule_data["date"], "%Y-%m-%d").date()
            created_at = datetime.fromisoformat(schedule_data["created_at"].replace("Z", "+00:00"))
            updated_at = datetime.fromisoformat(schedule_data["updated_at"].replace("Z", "+00:00"))
            
            # 状態の検証
            status_enum = None
            for status in ScheduleStatus:
                if status.value == schedule_data['status']:
                    status_enum = status
                    break
            
            if status_enum is None:
                print(f"  エラー: 無効なstatus値: {schedule_data['status']}")
                continue
            
            # スケジュールの作成
            schedule = Schedule(
                field_id=schedule_data["field_id"],
                date=date,
                user_id=schedule_data["user_id"],
                status=status_enum,
                comment=schedule_data["comment"],
                created_at=created_at,
                updated_at=updated_at
            )
            session.add(schedule)
            session.commit()
            print(f"  スケジュール追加: ID {schedule.id}")
        except IntegrityError:
            print(f"  スケジュール既存: ID {schedule_data['id']}")
            session.rollback()
        except Exception as e:
            print(f"  エラー: スケジュールID {schedule_data['id']} - {e}")
            session.rollback()
    
    print("スケジュールデータ投入完了")
    return True

def seed_histories(session, data_dir: str) -> bool:
    """
    履歴データを投入
    
    Args:
        session: データベースセッション
        data_dir: データディレクトリのパス
        
    Returns:
        bool: 成功時はTrue、失敗時はFalse
    """
    print("履歴データを投入中...")
    histories_data = load_json_data(os.path.join(data_dir, "histories.json"))
    if not histories_data:
        return False
    
    for history_data in histories_data:
        try:
            # 日時をdatetimeオブジェクトに変換
            executed_at = datetime.fromisoformat(history_data["executed_at"].replace("Z", "+00:00"))
            created_at = datetime.fromisoformat(history_data["created_at"].replace("Z", "+00:00"))
            
            # 履歴の作成
            history = History(
                schedule_id=history_data["schedule_id"],
                user_id=history_data["user_id"],
                executed_at=executed_at,
                comment=history_data["comment"],
                created_at=created_at
            )
            session.add(history)
            session.commit()
            print(f"  履歴追加: ID {history.id}")
        except IntegrityError:
            print(f"  履歴既存: ID {history_data['id']}")
            session.rollback()
        except Exception as e:
            print(f"  エラー: 履歴ID {history_data['id']} - {e}")
            session.rollback()
    
    print("履歴データ投入完了")
    return True

def main():
    """メイン処理"""
    print("初期データ投入を開始します...")
    
    # データディレクトリのパス
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    
    # セッション作成
    session = create_session()
    
    try:
        # 各テーブルにデータを投入（依存関係を考慮した順序）
        success = True
        success &= seed_users(session, data_dir)
        success &= seed_fields(session, data_dir)
        success &= seed_schedules(session, data_dir)
        success &= seed_histories(session, data_dir)
        
        if success:
            print("\n✅ 初期データ投入が完了しました！")
        else:
            print("\n❌ 初期データ投入中にエラーが発生しました。")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ 予期しないエラーが発生しました: {e}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    main() 