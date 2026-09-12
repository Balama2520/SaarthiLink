import httpx, os, json
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("GEMINI_API_KEY")
print("KEY length:", len(key) if key else 0)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
r = httpx.get(url)
print("Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    print("Available Models:")
    for m in data.get("models", []):
        if "generateContent" in m.get("supportedGenerationMethods", []):
            print(" -", m.get("name"))
else:
    print(r.text)
