# 作業履歴（work_log.md）

## 2024-06-10 環境構築

### 共通
- .gitignore を作成（Node.js, Python, Docker, VSCode, macOS向け）

### フロントエンド
- frontend ディレクトリに .dockerignore を作成
- frontend/Dockerfile を作成（Node.js 18系, Next.js/React用）
- frontend ディレクトリで package.json を初期化
- Next.js, React, ReactDOM をインストール

### バックエンド
- backend ディレクトリに .dockerignore を作成
- backend/Dockerfile を作成（Python 3.10系, FastAPI用）
- backend/requirements.txt を作成（fastapi, uvicorn[standard]）

---

## 2024-06-10 DB環境追加・バックエンドDB対応

### 共通
- docker-compose.yml を新規作成し、frontend, backend, db(PostgreSQL)の3サービス構成に

### バックエンド
- requirements.txt に sqlalchemy, psycopg2-binary, alembic を追加
- app/core/config.py でDATABASE_URLを環境変数から取得するように
- app/models/base.py でSQLAlchemy Baseを定義
- app/main.py にDB接続テスト用エンドポイント（/health/db）を追加


今後も作業ごとにこのファイルへ追記していく。 

## 2024-06-11 バックエンドAPI雛形実装

- FastAPIで以下のAPIエンドポイント雛形を作成
  - GET /api/schedules
  - POST /api/histories
  - GET /api/weather
- ルーティング分割（app/api/配下にschedules.py, histories.py, weather.pyを新規作成）
- main.pyで各ルーターをinclude
- Pydanticモデルは各APIファイル内に仮置き
- DB接続や外部API呼び出しはダミー実装 

## 2024-06-11 フロントエンド雛形作成

- Next.js/Reactで以下のページ雛形を作成
  - ダッシュボード（/）
  - カレンダー（/calendar）
  - 履歴一覧（/history）
  - 設定（/settings）
- 全ページ共通レイアウト（components/Layout.tsx）を作成
- _app.tsxでLayoutを全ページに適用
- 各ページは見出しと簡単なリストのみの構成 

## 2024-06-12 ダッシュボードAPI連携

- ダッシュボード画面（/）でAPI（/api/schedules, /api/weather）から当番・天気情報を取得し表示するよう実装
- ローディング・エラー時の表示も追加
- APIクライアント（lib/api.ts）を新規作成 

## 2024-06-12 カレンダー画面API連携

- カレンダー画面（/calendar）でAPI（/api/schedules）から当番スケジュール一覧を取得しリスト表示するよう実装
- ローディング・エラー時の表示も追加 

## 2024-06-12 履歴一覧画面API連携

- バックエンドにGET /api/histories（履歴一覧取得API）を追加
- フロントエンドでAPIから履歴データを取得しリスト表示するよう実装
- ローディング・エラー時の表示も追加 

## 2024-06-12 当番詳細画面実装

- /schedule/[id] で当番詳細画面を新規作成
- スケジュールIDでAPIから詳細情報・天気情報を取得し表示
- 「水かけ完了」ボタン・コメント入力欄を設置し、POST /api/histories で履歴登録できるよう実装 

## 2024-06-12 ユーザー管理画面実装

- バックエンドにGET/POST/DELETE/PATCH /api/users（ユーザー一覧取得・追加・削除・権限変更API）を追加
- フロントエンドでユーザー管理画面（/users）を新規作成し、API連携で一覧表示・追加・削除・権限変更ができるよう実装 

## 2024-06-12 畑情報・設定画面実装・UI強化

- バックエンドにGET/POST /api/fields（畑情報取得・更新API）を追加
- フロントエンドで設定画面（/settings）から畑情報の取得・編集ができるよう実装
- 天気APIキー・通知方法設定欄も設置
- 全ページ共通ナビゲーションバーを追加し、Linkコンポーネントでページ遷移を統一
- カレンダー画面から当番詳細画面へのリンクを追加
- テーブルやリストの見やすさ、ボタン・入力欄のUIを改善 

## 2024-06-12 ナビゲーションUI改善

- ナビゲーションバーを削除し、ダッシュボードに大きなボタンカードを配置
- 各機能（カレンダー・履歴・設定・ユーザー管理）へのナビゲーションを分かりやすいカードUIに変更
- アイコン・説明文付きで視認性・操作性を向上
- レスポンシブ対応も維持 

## 2024-06-12 畑の図面表示機能追加

- バックエンドAPIに畑テーブルの図面データ（image_url）フィールドを追加
- 設定画面に畑の図面表示エリアを追加
- 図面が存在する場合のみ表示、存在しない場合は非表示
- テーブル内のサムネイル表示と詳細表示の両方を実装 

## 2024-06-12 DB連携・永続化実装（SQLAlchemyモデル作成）

- modelsディレクトリ配下に各テーブル単位でSQLAlchemyモデルを作成
  - user.py: ユーザーテーブル（User, UserRole）
  - field.py: 畑テーブル（Field）
  - schedule.py: スケジュールテーブル（Schedule, ScheduleStatus）
  - history.py: 履歴テーブル（History）
- モデル間のリレーション（ForeignKey, relationship）を設定
- __init__.pyで全モデルをエクスポート 

## 2024-06-12 Alembicマイグレーション設定

- alembic.iniでAlembicの基本設定を構成
- env.pyでSQLAlchemyモデルとの連携設定
- 初回マイグレーション（0001_create_tables.py）で全テーブル作成
- テストデータ投入用マイグレーション（0002_insert_test_data.py）でサンプルデータ投入
- PostgreSQLのENUM型対応も含めて設定 