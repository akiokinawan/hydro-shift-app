# 畑の水かけ当番可視化アプリ ER図・DB設計仕様書

## 1. 主なエンティティ

### users（ユーザー）
- id（PK）
- name（氏名）
- email（メールアドレス）
- password_hash（パスワードハッシュ）
- role（権限: admin/user）
- created_at（登録日）

### fields（畑）
- id（PK）
- name（畑名）
- location_text（所在地）
- latitude（緯度）
- longitude（経度）
- weather_api_key（天気APIキー）
- created_by（作成者, FK: users.id）
- created_at（作成日）

### schedules（当番スケジュール）
- id（PK）
- field_id（畑ID, FK: fields.id）
- date（日付）
- user_id（担当ユーザーID, FK: users.id）
- status（ステータス: 未実施/完了）
- comment（コメント）
- created_at（登録日）

### histories（履歴）
- id（PK）
- schedule_id（スケジュールID, FK: schedules.id）
- user_id（実施ユーザーID, FK: users.id）
- executed_at（実施日）
- comment（コメント）

### notifications（通知設定）
- id（PK）
- user_id（ユーザーID, FK: users.id）
- type（通知方法: email/line）
- destination（通知先）
- enabled（有効/無効）

---

## 2. ER図（テキスト表現）

```
[users] 1---n [schedules] n---1 [fields]
   |                |
   |                n
   |                |
   n              [histories]
   |
   n
[notifications]
```

- users（1）---（n）schedules
- fields（1）---（n）schedules
- schedules（1）---（n）histories
- users（1）---（n）notifications

---

## 3. テーブル定義

### users
| 列名           | 型           | 制約           | 説明           |
|----------------|--------------|----------------|----------------|
| id             | int          | PK, auto       | ユーザーID     |
| name           | varchar(64)  | not null       | 氏名           |
| email          | varchar(128) | unique, not null | メールアドレス |
| password_hash  | varchar(256) | not null       | パスワードハッシュ |
| role           | varchar(16)  | default 'user' | 権限           |
| created_at     | datetime     | not null       | 登録日         |

### fields
| 列名           | 型           | 制約           | 説明           |
|----------------|--------------|----------------|----------------|
| id             | int          | PK, auto       | 畑ID           |
| name           | varchar(64)  | not null       | 畑名           |
| location_text  | varchar(128) |                | 所在地         |
| latitude       | float        |                | 緯度           |
| longitude      | float        |                | 経度           |
| weather_api_key| varchar(128) |                | 天気APIキー    |
| created_by     | int          | FK(users.id)   | 作成者         |
| created_at     | datetime     | not null       | 作成日         |

### schedules
| 列名           | 型           | 制約           | 説明           |
|----------------|--------------|----------------|----------------|
| id             | int          | PK, auto       | スケジュールID |
| field_id       | int          | FK(fields.id)  | 畑ID           |
| date           | date         | not null       | 日付           |
| user_id        | int          | FK(users.id)   | 担当ユーザー   |
| status         | varchar(16)  | default '未実施'| ステータス     |
| comment        | text         |                | コメント       |
| created_at     | datetime     | not null       | 登録日         |

### histories
| 列名           | 型           | 制約           | 説明           |
|----------------|--------------|----------------|----------------|
| id             | int          | PK, auto       | 履歴ID         |
| schedule_id    | int          | FK(schedules.id)| スケジュールID |
| user_id        | int          | FK(users.id)   | 実施ユーザー   |
| executed_at    | datetime     | not null       | 実施日         |
| comment        | text         |                | コメント       |

### notifications
| 列名           | 型           | 制約           | 説明           |
|----------------|--------------|----------------|----------------|
| id             | int          | PK, auto       | 通知ID         |
| user_id        | int          | FK(users.id)   | ユーザーID     |
| type           | varchar(16)  | not null       | 通知方法       |
| destination    | varchar(128) | not null       | 通知先         |
| enabled        | boolean      | default true   | 有効/無効      |

---

## 4. ER図（画像）

![ER図](er_diagram.png)

---

※ er_diagram.png をこのディレクトリに配置してください。 