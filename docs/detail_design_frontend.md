# 畑の水かけ当番可視化アプリ 画面詳細設計

---

## 1. ダッシュボード画面

- **表示要素**
  - 本日の当番ユーザー名
  - 本日の天気・降雨量（API連携）
  - 「水かけ必要/不要」判定
  - 次回当番の案内
  - カレンダー画面へのリンク
  - 履歴画面へのリンク
  - 設定画面へのリンク

- **主な処理フロー**
  1. ログイン後、ユーザー情報を取得
  2. 本日の当番・天気情報をAPIで取得
  3. 降雨量しきい値で「水かけ必要/不要」を判定
  4. 各種画面への遷移リンクを表示

---

## 2. カレンダー画面

- **表示要素**
  - 月/週カレンダー
  - 各日の当番ユーザー
  - 当番の追加・編集（管理者のみ）
  - 当番詳細画面へのリンク

- **主な処理フロー**
  1. 畑・月を指定してスケジュール一覧をAPI取得
  2. カレンダーUIに当番情報をマッピング
  3. 日付クリックで当番詳細画面へ遷移
  4. 管理者は当番の追加・編集が可能

---

## 3. 当番詳細画面

- **表示要素**
  - 日付・当番ユーザー
  - 天気・降雨量情報
  - 水かけ完了ボタン
  - コメント入力欄
  - 履歴一覧へのリンク

- **主な処理フロー**
  1. スケジュールIDで詳細情報をAPI取得
  2. 水かけ完了時、履歴APIにPOST
  3. コメントも履歴に保存

---

## 4. 履歴一覧画面

- **表示要素**
  - 実施日・担当者・コメントのリスト
  - フィルタ（期間・ユーザー）

- **主な処理フロー**
  1. 履歴APIから一覧取得
  2. フィルタ条件で再取得

---

## 5. ユーザー管理画面（管理者用）

- **表示要素**
  - ユーザー一覧
  - 追加・削除・権限変更ボタン

- **主な処理フロー**
  1. ユーザーAPIから一覧取得
  2. 追加・削除・編集時はAPI呼び出し

---

## 6. 畑情報・設定画面

- **表示要素**
  - 畑の所在地（市区町村/緯度経度）
  - 天気APIキー設定
  - 通知方法設定

- **主な処理フロー**
  1. 畑APIから情報取得
  2. 編集時はAPIで更新

---

## 7. データ構造例（TypeScript型）

```ts
// ユーザー
type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
};

// 畑
type Field = {
  id: number;
  name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  weather_api_key?: string;
  created_by: number;
  created_at: string;
};

// スケジュール
type Schedule = {
  id: number;
  field_id: number;
  date: string;
  user: User;
  status: '未実施' | '完了';
  comment?: string;
  created_at: string;
};

// 履歴
type History = {
  id: number;
  schedule_id: number;
  user_id: number;
  executed_at: string;
  comment?: string;
};
```

---

この設計をもとにフロントエンド実装を進めてください。 