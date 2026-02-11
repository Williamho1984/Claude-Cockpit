# PowerShell 啟動腳本
# 用於同時啟動前端和後端伺服器

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Claude Cockpit UI 啟動腳本" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Node.js 是否安裝
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 錯誤: 未安裝 Node.js" -ForegroundColor Red
    Write-Host "請先安裝 Node.js >= 16.x" -ForegroundColor Yellow
    exit 1
}

# 檢查 npm 是否安裝
try {
    $npmVersion = npm --version
    Write-Host "✓ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 錯誤: 未安裝 npm" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 檢查後端依賴是否已安裝
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "後端依賴尚未安裝，正在安裝..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
    Write-Host "✓ 後端依賴安裝完成" -ForegroundColor Green
} else {
    Write-Host "✓ 後端依賴已安裝" -ForegroundColor Green
}

# 檢查前端依賴是否已安裝
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "前端依賴尚未安裝，正在安裝..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
    Write-Host "✓ 前端依賴安裝完成" -ForegroundColor Green
} else {
    Write-Host "✓ 前端依賴已安裝" -ForegroundColor Green
}

Write-Host ""
Write-Host "正在啟動伺服器..." -ForegroundColor Cyan
Write-Host ""

# 啟動後端伺服器（背景執行）
Write-Host "啟動後端伺服器 (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm start"

# 等待 2 秒讓後端啟動
Start-Sleep -Seconds 2

# 啟動前端伺服器（背景執行）
Write-Host "啟動前端伺服器 (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

# 等待 3 秒讓前端啟動
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  伺服器啟動完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "後端伺服器: http://localhost:3001" -ForegroundColor Cyan
Write-Host "前端介面:   http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "請在瀏覽器中訪問: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 可停止此腳本（但伺服器會繼續運行）" -ForegroundColor Gray
Write-Host "若要停止伺服器，請關閉對應的 PowerShell 視窗" -ForegroundColor Gray
Write-Host ""

# 自動開啟瀏覽器
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host "已自動開啟瀏覽器" -ForegroundColor Green
Write-Host ""
