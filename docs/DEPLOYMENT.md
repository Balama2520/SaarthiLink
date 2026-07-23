# Deployment Guide (24/7/365 Production)

## AWS EC2 Native Deployment (Recommended)

To deploy Saarthi AI on an AWS EC2 instance without Docker:

### 1. Provision EC2
- Use an Ubuntu 22.04 or Amazon Linux 2 instance.
- Ensure Port `2520` (Backend) is open in the Security Group.

### 2. Environment Setup
```bash
sudo apt update && sudo apt install python3-pip -y
pip install -r backend/requirements.txt
```

### 3. Start Neural Engine (Ollama)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull phi3
```

### 4. Launch Backend
```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 2520
```

### 5. Frontend Uplink
Deploy the `frontend/` directory to **Netlify** or **Vercel**. Ensure `API_URL` in `auth.js` points to your EC2 Public IP.

---
**Reliability Standard: 24/7/365. Developed by Bala Maneesh Ayanala.**
