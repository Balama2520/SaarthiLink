# BUDDY AI - NEURAL LINK CONTROL (PS1)
$Host.UI.RawUI.WindowTitle = "BUDDY AI - NEURAL LINK CONTROL"
Clear-Host

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "        BUDDY AI : NEURAL INTERFACE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Set required environment variables
$env:SECRET_KEY = "buddy-dev-secret-change-in-production"
$env:ALLOWED_ORIGINS = "http://localhost:8080,http://127.0.0.1:8080,https://buddy-ai-assistant.netlify.app"

# 1. Cleanup old processes
Write-Host "[1/4] SYNCING NEURAL PATHWAYS..." -ForegroundColor DarkCyan
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# 2. Start Ollama
Write-Host "[2/4] IGNITING NEURAL ENGINE (OLLAMA)..." -ForegroundColor Magenta
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Minimized -ErrorAction SilentlyContinue

# 3. Start Backend
Write-Host "[3/4] ESTABLISHING UPLINK (BACKEND)..." -ForegroundColor Yellow
$BackendArgs = "-Command", "cd backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 2520 --reload"
Start-Process "powershell" -ArgumentList $BackendArgs -WindowStyle Maximized -WorkingDirectory $PSScriptRoot

# 4. Launch Interface
Write-Host "[4/4] LOADING VISUAL CORTEX (FRONTEND)..." -ForegroundColor Green
Start-Process "python" -ArgumentList "-m http.server 8080 --directory frontend" -WindowStyle Minimized -WorkingDirectory $PSScriptRoot
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   LINK ESTABLISHED. SYSTEM IS OPERATIONAL." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: You can keep this monitor open for session logs." -ForegroundColor Gray
Write-Host "Press any key to exit this initialization window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
