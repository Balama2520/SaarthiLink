FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Step 1: Install CPU-only PyTorch first from PyTorch's official CPU index.
# This prevents pip from pulling the 2+ GB CUDA/GPU wheels that are useless
# on Render's CPU servers and cause build OOM/timeouts.
RUN pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        "torch==2.4.1"

# Step 2: Install the rest. Pip sees torch already satisfied and skips the
# GPU wheels that sentence-transformers / chromadb would otherwise pull in.
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations and start FastAPI
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-2520}"]
