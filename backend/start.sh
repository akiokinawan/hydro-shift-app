#!/bin/bash

set -e  # エラー時に即終了

echo "📦 Running Alembic migrations..."
alembic upgrade head

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
