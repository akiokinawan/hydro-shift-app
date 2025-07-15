# mizukake-toban-app 開発手引き

## 1. 開発環境構成
- **ローカル開発環境**（Docker推奨）
- **本番環境**（AWS/ECS等、後日構築）

---

## 2. ブランチ戦略
- **Git Flow**を採用
  - `main`: 本番用
  - `develop`: 開発用
  - `feature/*`: 機能開発用
  - `release/*`, `hotfix/*` も必要に応じて

---

## 3. CI/CD
- **GitHub Actions**を利用
  - プッシュ/PR時にLint・テスト・ビルドを自動実行
  - 本番デプロイは後日対応

---

## 4. Docker
- フロントエンド・バックエンドともにDockerで開発・起動可能にする
- `docker-compose`で一括起動予定
- 例: `docker-compose up --build`

---

## 5. 開発の流れ
1. リポジトリをクローン
2. ブランチを切って開発（`feature/xxx`）
3. コード修正後、PR作成
4. GitHub Actionsで自動チェック
5. develop/mainへマージ
6. 本番デプロイは準備でき次第対応

---

## 6. 今後の予定
- まずはローカルで正しく動作するものを構築
- クラウド（AWS）への本番デプロイは段階的に進める
- セキュリティ・監視・アラート等は必要に応じて追加

---

## ローカル開発環境をDockerで立ち上げて動作確認する手順

### 前提
- Docker Desktopがインストール済みであること
- このリポジトリをローカルにクローン済みであること

### 1. プロジェクトルートに移動

```bash
cd /Users/aki/work/mizukake-toban-app
```

### 2. Dockerイメージのビルド＆コンテナ起動

初回や構成変更時は `--build` オプションを付けてください。

```bash
docker-compose up --build
```

- `frontend`（Next.js）、`backend`（FastAPI）、`db`（PostgreSQL）がまとめて起動します。
- 初回はイメージのビルドで数分かかる場合があります。

### 3. 動作確認

#### フロントエンド
- ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス
  - ダッシュボード画面などが表示されればOK

#### バックエンド
- ブラウザやcurlで [http://localhost:8000/health/db](http://localhost:8000/health/db) などにアクセス
  - `{"db": 1}` のようなレスポンスが返ればOK
- Swagger UI（APIドキュメント）は [http://localhost:8000/docs](http://localhost:8000/docs) で確認できます

### 4. 停止方法

動作確認が終わったら、ターミナルで `Ctrl + C` で停止できます。
不要なコンテナを完全に削除したい場合は：

```bash
docker-compose down
```

### 5. よくあるトラブル

- ポート競合（3000, 8000, 5432）が他のアプリで使われていないかご注意ください
- 変更を反映したい場合は再度 `docker-compose up --build` を実行してください

---

何か不明点や追加要望があれば、随時このドキュメントに追記してください。 