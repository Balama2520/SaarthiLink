 **AI-Powered Career Platform for Students**

Developed by **Bala Maneesh Ayanala**. Saarthi AI is a career copilot designed specifically for Indian students, freshers, and job seekers. It transforms the generic chatbot experience into a focused tool for career advancement.

## 🚀 Vision

Saarthi AI helps you navigate your career journey through personalised modules:
- **Resume Analysis**: Upload your resume to get an ATS Score, identify skill gaps, and receive actionable suggestions.
- **Roadmap Generator**: Generate 30-day and 90-day learning roadmaps, including recommended projects and courses for your target role.
- **Job Matching**: AI-driven matching of your resume to suitable internships and jobs.
- **Interview Preparation**: Practice with tailored technical questions, behavioural questions, and mock interviews.
- **Learning Assistant**: Get structured notes, roadmaps, and practice materials for technologies like React, ML, and AWS.

## 🛠️ Architecture

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, ShadCN
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (planned) / SQLite (MVP)
- **Vector DB**: ChromaDB (Semantic Search with `all-MiniLM-L6-v2`)
- **AI Layer**: Ollama (Local), Gemini, OpenAI

## ⚡ Quick Start (MVP Local Setup)

- Python 3.10+
- [Ollama](https://ollama.ai/) (Running locally)

### Installation
1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/saarthi-ai.git
    cd saarthi-ai
    ```

2.  **Launch (Manual)**
    ```bash
    # Backend
    cd backend
    pip install -r requirements.txt
    uvicorn app. main: app --host 0.0.0.0 --port 2520

    # Frontend
    cd ../frontend
    npm install
    npm run dev
    ```

## 🛡️ License
MIT License - open for modification and distribution.
