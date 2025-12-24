# Backend - Development Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (gcc for building some python packages)
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port (matched with config)
EXPOSE 2520

# Hot reload for dev
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "2520", "--reload"]
