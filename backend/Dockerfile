FROM python:3.10

WORKDIR /app

# 依存ファイルのインストール
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# アプリとスクリプトをコピー
COPY . .

# start.sh を使ってマイグレーション → アプリ起動
RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
