# 🧠 BUDDY AI - Neural Interface
> *A Next-Generation AI Assistant with Kinetic UI, Voice Synthesis, and Local Neural Processing.*

![Buddy AI Banner](https://via.placeholder.com/1200x600/0f172a/38bdf8?text=BUDDY+AI+NEURAL+LINK)

## 🌟 Overview
Buddy AI is a production-grade neural interface designed to feel like a futuristic "Jarvis" system. It features a fully reactive 3D visualizer, professional voice synthesis, and a persistent memory stream, all powered by open-source LLMs (via Ollama) or cloud APIs.

## 🚀 Key Features
- **Kinetic UI**: Smooth, frame-rate independent animations and "glassmorphism" aesthetics.
- **Neural Voice**: WebSpeech API integration with custom voice selection and real-time audio visualization.
- **Persistent Memory**: Smart session management with local storage and backend persistence.
- **Secure**: Privacy-first design with local-only processing options and rigorous input sanitization.
- **Mobile Ready**: Fully responsive design that works on any device.

## 🛠️ Stack
- **Frontend**: Vanilla JS (ES6+), CSS3 Variables, HTML5
- **Backend**: Python (FastAPI), SQLAlchemy (SQLite)
- **AI Engine**: Ollama (Local)

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- [Ollama](https://ollama.ai/) (Running locally)

### Installation
1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/buddy-ai.git
    cd buddy-ai
    ```

2.  **Launch (Windows)**
    Simply double-click `run_buddy.bat` to auto-install dependencies and start the system.

3.  **Launch (Manual)**
    ```bash
    # Backend
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 2520

    # Frontend
    cd ../frontend
    python -m http.server 8080
    ```

## 🐳 Docker Deployment
```bash
docker-compose up --build -d
```
Access the neural link at `http://localhost:8080`.

## 🛡️ License
MIT License - open for modification and distribution.
