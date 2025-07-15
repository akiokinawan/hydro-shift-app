# 畑の水かけ当番可視化アプリ API設計仕様書

## 1. 認証系

### POST /api/auth/register
- ユーザー新規登録
- リクエスト:
  ```json
  {
    "name": "田中太郎",
    "email": "taro@example.com",
    "password": "password123"
  }
  ```
- レスポンス:
  ```json
  {
    "id": 1,
    "name": "田中太郎",
    "email": "taro@example.com"
  }
  ```

### POST /api/auth/login
- ログイン
- リクエスト:
  ```json
  {
    "email": "taro@example.com",
    "password": "password123"
  }
  ```
- レスポンス:
  ```json
  {
    "access_token": "xxxx.yyyy.zzzz"
  }
  ```

---

## 2. ユーザー管理

### GET /api/users
- ユーザー一覧取得（管理者のみ）

### GET /api/users/{user_id}
- ユーザー詳細取得

### PUT /api/users/{user_id}
- ユーザー情報更新

### DELETE /api/users/{user_id}
- ユーザー削除（管理者のみ）

---

## 3. 畑管理

### GET /api/fields
- 畑一覧取得

### POST /api/fields
- 畑新規登録

### GET /api/fields/{field_id}
- 畑詳細取得

### PUT /api/fields/{field_id}
- 畑情報更新

### DELETE /api/fields/{field_id}
- 畑削除

---

## 4. 当番スケジュール

### GET /api/schedules?field_id=1&month=2024-06
- スケジュール一覧取得（カレンダー用）

### POST /api/schedules
- スケジュール新規登録

### GET /api/schedules/{schedule_id}
- スケジュール詳細取得

### PUT /api/schedules/{schedule_id}
- スケジュール更新

### DELETE /api/schedules/{schedule_id}
- スケジュール削除

---

## 5. 履歴

### GET /api/histories?user_id=1
- 履歴一覧取得

### POST /api/histories
- 水かけ実施記録（完了ボタン）

---

## 6. 通知設定

### GET /api/notifications
- 通知設定取得

### POST /api/notifications
- 通知設定新規登録

### PUT /api/notifications/{notification_id}
- 通知設定更新

### DELETE /api/notifications/{notification_id}
- 通知設定削除

---

## 7. 天気情報

### GET /api/weather?field_id=1&date=2024-06-10
- 指定畑・日付の天気・降雨量取得

---

## 8. サンプルレスポンス（抜粋）

### GET /api/schedules?field_id=1&month=2024-06
```json
[
  {
    "id": 10,
    "field_id": 1,
    "date": "2024-06-10",
    "user": {
      "id": 2,
      "name": "佐藤花子"
    },
    "status": "未実施",
    "comment": ""
  }
]
```

### GET /api/weather?field_id=1&date=2024-06-10
```json
{
  "date": "2024-06-10",
  "weather": "晴れ",
  "rain_mm": 0.0
}
```

---

ご要望に応じてAPI詳細や追加エンドポイントも拡張可能です。 