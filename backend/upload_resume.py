import os
import requests
from pathlib import Path

url = 'http://127.0.0.1:2520/api/resume/upload'
path = Path('uploads/91235251-0b4a-4f11-9f67-fa00b684f587.pdf')
with path.open('rb') as f:
    files = {'file': (path.name, f, 'application/pdf')}
    resp = requests.post(url, files=files, timeout=180)
    print(resp.status_code)
    print(resp.text)
