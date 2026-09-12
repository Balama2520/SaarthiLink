<div align="center">
  <h1>Saarthi AI 🧭</h1>
  <p><b>Guiding Intelligence • Connected Action</b></p>
  <p><i>The Production Career & Opportunity Intelligence Platform</i></p>
  
  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-core-architecture">Architecture</a> •
    
    <a href="#-job-seeding-control-center">14-Tab Job Seeding</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-verification">Verification</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Pytest-190%2F190%20PASS-brightgreen" alt="Pytest" />
    <img src="https://img.shields.io/badge/E2E-26%2F26%20PASS-brightgreen" alt="E2E" />
  </p>
</div>

---

## 🌟 Overview

**Saarthi AI — Guiding Intelligence • Connected Action** is a production-quality Career & Opportunity Intelligence platform connecting candidates, companies, recruiters, and educational institutions. Developed by **Bala Maneesh Ayanala** (Contact: `saarthi.ai.team@gmail.com`), it provides hyper-personalized, data-driven intelligence to bridge the gap between job seekers and employers.

---

## 🛑 The Problem We Solve (Why We Designed This)

The modern job market is overwhelmingly competitive, particularly for fresh graduates. Students often face a "cold start" problem:
- **Generic Advice:** Existing AI tools (like standard LLM chats) give broad, generic advice that lacks industry-specific or regional context.
- **The ATS Black Hole:** Thousands of resumes are rejected by Applicant Tracking Systems (ATS) simply due to formatting or missing keywords, without any feedback to the candidate.
- **Lack of Direction:** Students often don't know *what* to study next to get from Point A (current skills) to Point B (dream job).
- **Interview Anxiety:** Without a mentor, practicing for interviews is unstructured and highly subjective.

**The Solution:** Saarthi AI acts as a personalized, 24/7 career mentor that deeply understands your current profile and provides actionable, step-by-step guidance to get you hired.

---

## ✨ What Makes It Special?

- **Hyper-Personalization:** Saarthi doesn't just answer questions; it maintains context about *your* specific resume, *your* target role, and *your* skill gaps.
- **Actionable Outputs over Chat:** Instead of just conversational text, Saarthi generates tangible assets: concrete 30/90-day learning roadmaps, specific ATS scores with diffs, and curated project recommendations.
- **Privacy-First AI (Ollama):** By supporting local LLM execution via Ollama, sensitive data like resumes can be processed completely locally without sending PII to the cloud.
- **RAG-Powered Knowledge:** It utilizes Retrieval-Augmented Generation (ChromaDB) to ground its advice in real-world tech requirements, preventing AI hallucinations.

---

## 🚀 Core Features

- 📄 **Smart Resume Analysis**: Upload your CV to receive an instant ATS score. The AI identifies critical skill gaps and provides line-by-line refinement strategies.
- 🗺️ **Dynamic Roadmap Generator**: Instantly generate 30-day and 90-day custom learning roadmaps. Includes curated projects and courses aligned exactly with your dream role.
- 🎯 **Intelligent Job Matching**: Leverages semantic search algorithms to align your profile with the most suitable internships and full-time opportunities.
- 🎙️ **Mock Interviews & Prep**: Prepare like a pro with tailored technical and behavioral questions, simulated in realistic interview environments based on the company you are applying to.
- 🧠 **Interactive Learning Assistant**: Access structured notes, cheatsheets, and guided practice materials for cutting-edge technologies.

---

## 🏗️ Architecture & Tech Stack (The "Why")

Saarthi AI is built on a modern, robust, and scalable tech stack. Every tool was chosen with a specific purpose in mind:

### Frontend: React + TypeScript + Vite + Tailwind CSS
- **Why React & TypeScript?** Ensures a highly interactive, component-driven UI with strict type safety, eliminating a massive class of runtime errors before they reach production.
- **Why Vite?** Provides lightning-fast Hot Module Replacement (HMR) for an exceptional developer experience compared to older bundlers like Webpack.
- **Why Tailwind & ShadCN?** Allows for rapid UI prototyping with a consistent, accessible, and premium design language without writing custom CSS from scratch.

### Backend: FastAPI (Python)
- **Why FastAPI?** Python is the undisputed king of the AI/ML ecosystem. FastAPI provides native asynchronous support (critical for handling slow LLM API calls without blocking), automatic OpenAPI documentation, and incredible performance built on Starlette and Pydantic.

### AI & Data Layer: ChromaDB + Ollama / Gemini
- **Why ChromaDB?** An open-source embedding database that allows us to perform blazingly fast semantic searches (e.g., matching a candidate's skills to a job description's latent meaning, not just exact keyword matches). We use `all-MiniLM-L6-v2` for efficient local embeddings.
- **Why Ollama?** Allows users to run powerful open-source models locally on their own hardware, ensuring complete data privacy and zero API costs during development.
- **Why Gemini/OpenAI?** Supported as powerful cloud fallbacks for complex reasoning tasks where local models might struggle.

### Database: SQLite (MVP) -> PostgreSQL (Production)
- **Why?** SQLite provides a frictionless local development experience with zero setup required. The architecture allows for a seamless transition to PostgreSQL for concurrent, scalable production deployments later.

---

## ⚡ Quick Start

Get Saarthi AI up and running on your local machine in minutes.

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai/) (Running locally for local AI features)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/saarthi-ai.git
cd saarthi-ai
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 2520 --reload
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start the development server
npm run dev
```

Visit `http://localhost:5173` in your browser to access the Saarthi AI interface!

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's a bug fix, a new feature, or a documentation update, your help is appreciated. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <i>Built with ❤️ for the student community.</i>
</div>
