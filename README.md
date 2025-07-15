# 畑の水かけ当番可視化アプリ 要件定義・設計方針

## 1. 概要
畑の水かけ当番を可視化・管理し、当番の負担軽減や情報共有を目的としたWebアプリケーション。

---

## 2. 機能要件

### 2.1 ユーザー管理
- ユーザー登録・ログイン（Google認証やメールアドレス等）
- ユーザーごとのプロフィール管理

### 2.2 当番スケジュール管理
- 水かけ当番のスケジュール作成・編集
- カレンダー表示（週・月単位）
- 当番の自動割り当て（ランダム/ローテーション）

### 2.3 通知機能
- 当番前日のリマインダー通知（メールやLINE通知など）

### 2.4 履歴管理
- 水かけ実施の記録（完了ボタン、コメント等）
- 履歴の一覧表示

### 2.5 管理者機能
- ユーザーの追加・削除
- スケジュールの一括編集

### 2.6 天気予報連携機能
- 畑の所在地（市区町村や緯度経度）を登録
- 外部天気API（無料、例：OpenWeatherMap, 気象庁API等）から当日の天気予報・降雨量を取得
- 降雨量が一定以上の場合は「水かけ不要」と表示 or 通知
- 天気情報を当番スケジュールや履歴画面に表示

---

## 3. 非機能要件
- モバイル・PC両対応（レスポンシブデザイン）
- セキュリティ（認証・認可）
- データのバックアップ
- シンプルで直感的なUI

---

## 4. 最新ディレクトリ構成（2024/06時点案）

```
gemini_test_project/
├── frontend/                      # フロントエンド（TypeScript, React/Next.js）
│   ├── public/                    # 静的ファイル
│   └── src/
│       ├── components/            # 再利用可能なUI部品
│       ├── pages/                 # ルーティングページ
│       ├── features/              # ドメインごとのロジック
│       │   ├── users/
│       │   ├── schedule/
│       │   ├── history/
│       │   ├── weather/           # 天気予報取得・表示
│       ├── hooks/                 # カスタムフック
│       ├── utils/                 # 汎用ユーティリティ
│       ├── styles/                # スタイル関連
│       ├── lib/                   # 外部サービス連携
│       │   └── weatherApi.ts      # 天気API通信
│       ├── types/                 # 型定義
│       └── ...
├── backend/                       # バックエンド（Python, FastAPI）
│   └── app/
│       ├── main.py                # エントリポイント
│       ├── api/                   # APIエンドポイント
│       ├── models/                # DBモデル
│       ├── services/              # ビジネスロジック
│       │   └── weather.py         # 天気API連携
│       ├── core/                  # 設定・共通処理
│       └── ...
├── infra/                         # インフラ（AWS IaC, Terraform等）
│   ├── terraform/
│   ├── scripts/
│   └── ...
├── .env.local                     # 環境変数
├── README.md
├── package.json                   # フロントエンド用
├── requirements.txt               # バックエンド用
└── ...
```

---

## 5. 技術選定方針

- **フロントエンド**: TypeScript + React (Next.js等)
- **バックエンド**: Python (FastAPI, Flask等)
- **天気API**: 無料で利用可能なAPI（OpenWeatherMap, 気象庁API等）
- **インフラ**: AWS（EC2, S3, RDS, Lambda, Cognito等を想定）
- **認証**: AWS CognitoやFirebase Auth等を検討

---

## 6. 今後の検討事項
- 画面設計（ワイヤーフレーム）
-- docs/screen_design.md
- ER図・DB設計
-- docs/db_design.md
- API設計
-- docs/api_design.md
- 開発手引き
-- docs/dev_guide.md
---

ご要望・ご質問があれば随時ご相談ください。 