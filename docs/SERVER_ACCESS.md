# Server Access Documentation

## Primary Neural Nodes

### 1. AI Brain Node (Ollama)
- **Instance ID**: `i-069252d90a37fc1ca`
- **Public IP**: `51.20.92.188`
- **API Endpoint**: `http://51.20.92.188:11434`
- **Roles**: Neural Processing, LLM Hosting (Ollama)
- **Access**: `ssh ubuntu@51.20.92.188`

### 2. Backend Application Node
- **Instance ID**: `i-0ebf90aba88c2f98b`
- **Public IP**: `16.170.208.71`
- **Roles**: FastAPI Backend, Database, Session Management
- **Access**: `ssh ubuntu@16.170.208.71`

## Configuration
- **OLLAMA_URL**: `http://51.20.92.188:11434/api/generate` (Configured in `backend/app/config.py` and `.env`)
- **BACKEND_PORT**: `2520` (Configured in `backend/app/config.py`)
- **FRONTEND_PORT**: `8080` (Local)
