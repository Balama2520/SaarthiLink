# System Architecture

## Overview
Saarthi AI uses a microservices-inspired architecture designed for scalability and containerization.

## Components
1. **Frontend**: Static SPA (Single Page Application) served via Nginx.
2. **Backend**: FastAPI (Python) service handling business logic, auth, and database interactions.
3. **Database**: SQLite (Dev) / PostgreSQL (Prod).
4. **AI Engine**: Ollama running locally or as a sidecar.

## System Diagram

```mermaid
graph TD
    Client[Browser / Client] -->|HTTP/WS| Ingress[Nginx Ingress / Frontend]
    Ingress -->|/api| API[FastAPI Backend]
    Ingress -->|/| UI[Static Frontend Files]
    
    API -->|Prompt| Ollama[Ollama AI Engine]
    API -->|Query| DB[(PostgreSQL / SQLite)]
    
    subgraph Data Layer
        DB
    end
    
    subgraph Compute Layer
        API
        Ollama
    end
```
