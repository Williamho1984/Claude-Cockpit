#!/bin/bash

# Bash 啟動腳本（適用於 Git Bash 或 WSL）
# 用於同時啟動前端和後端伺服器

echo "=================================="
echo "  Claude Cockpit UI 啟動腳本"
echo "=================================="
echo ""

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "✗ 錯誤: 未安裝 Node.js"
    echo "請先安裝 Node.js >= 16.x"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js 版本: $NODE_VERSION"

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "✗ 錯誤: 未安裝 npm"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✓ npm 版本: $NPM_VERSION"
echo ""

# 檢查後端依賴是否已安裝
if [ ! -d "backend/node_modules" ]; then
    echo "後端依賴尚未安裝，正在安裝..."
    cd backend
    npm install
    cd ..
    echo "✓ 後端依賴安裝完成"
else
    echo "✓ 後端依賴已安裝"
fi

# 檢查前端依賴是否已安裝
if [ ! -d "frontend/node_modules" ]; then
    echo "前端依賴尚未安裝，正在安裝..."
    cd frontend
    npm install
    cd ..
    echo "✓ 前端依賴安裝完成"
else
    echo "✓ 前端依賴已安裝"
fi

echo ""
echo "正在啟動伺服器..."
echo ""

# 啟動後端伺服器（背景執行）
echo "啟動後端伺服器 (port 3001)..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# 等待 2 秒讓後端啟動
sleep 2

# 啟動前端伺服器（背景執行）
echo "啟動前端伺服器 (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# 等待 3 秒讓前端啟動
sleep 3

echo ""
echo "=================================="
echo "  伺服器啟動完成！"
echo "=================================="
echo ""
echo "後端伺服器: http://localhost:3001"
echo "前端介面:   http://localhost:5173"
echo ""
echo "請在瀏覽器中訪問: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止所有伺服器"
echo ""

# 捕捉 Ctrl+C 信號
trap "echo ''; echo '正在停止伺服器...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 保持腳本運行
wait
