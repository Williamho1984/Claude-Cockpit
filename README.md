# Claude Cockpit UI

專業的 Web UI 控制台，用於在 Windows 環境下與 Claude Code 進行互動。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 專案概述

Claude Cockpit UI 提供一個現代化的儀表板介面，透過 WebSocket 即時通訊與底層的 `claude.exe` 進行溝通，支援視覺化的多角色狀態監控與終端機互動。

### ✨ 核心功能

- 🎨 **現代化 UI** - React + TypeScript + Tailwind CSS
- 🔄 **即時通訊** - WebSocket 零延遲
- 👥 **多角色監控** - PM、RD、UI、TEST、SEC 五個角色狀態追蹤
- 💻 **完整終端** - Xterm.js 完美終端機模擬
- ⚡ **快速啟動** - 一鍵啟動腳本

## 🚀 快速開始

### 環境需求

- Node.js >= 16.x
- npm >= 8.x
- Git for Windows（Windows）或 bash（Linux/Mac）

### 安裝

```bash
# Clone 專案
git clone https://github.com/YOUR_USERNAME/claude-cockpit-ui.git
cd claude-cockpit-ui

# 使用啟動腳本（推薦）
.\start.ps1  # Windows PowerShell
./start.sh   # Linux/Mac/Git Bash

# 或手動安裝
cd backend && npm install
cd ../frontend && npm install
```

### 啟動

```bash
# 方法 1: 使用啟動腳本
.\start.ps1  # Windows
./start.sh   # Linux/Mac

# 方法 2: 手動啟動
# 終端機 1 - 後端
cd backend && npm start

# 終端機 2 - 前端
cd frontend && npm run dev
```

訪問 `http://localhost:5173`

## 📚 文件

- [快速開始指南](QUICKSTART.md)
- [部署指南](DEPLOYMENT.md)
- [開發者指南](DEVELOPER.md)
- [雲端遷移指南](CLOUD_MIGRATION.md)
- [程式碼審查報告](docs/code_review.md)

## 🛠️ 技術棧

**前端**
- React 18.2
- TypeScript 5.3
- Vite 5.0
- Tailwind CSS 3.4
- Xterm.js 5.3
- Socket.io-client 4.6

**後端**
- Node.js
- node-pty 0.10
- Socket.io 4.6

## 📁 專案結構

```
Claude Cockpit/
├── backend/              # Node.js 後端
│   ├── server.js        # 主伺服器
│   └── package.json
├── frontend/            # React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   └── package.json
├── docs/                # 文件
├── config.json          # 專案配置
└── README.md
```

## ⚙️ 配置

編輯 `config.json` 自訂設定：

```json
{
  "backend": {
    "port": 3001,
    "bashPath": "C:\\Program Files\\Git\\bin\\bash.exe"
  },
  "roles": [
    { "id": "pm", "title": "PM", "color": "border-purple-500" }
  ]
}
```

## 🎨 截圖

> 專案提供專業的暗色主題 UI，支援即時狀態更新與終端機互動。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 🙏 致謝

- [Xterm.js](https://xtermjs.org/) - 終端機渲染
- [Socket.io](https://socket.io/) - WebSocket 通訊
- [Tailwind CSS](https://tailwindcss.com/) - UI 框架

## 📞 支援

如有問題，請查看：
- [常見問題](DEPLOYMENT.md#常見問題)
- [故障排除](DEPLOYMENT.md#故障排除)
- [開發者指南](DEVELOPER.md)

---

**Made with ❤️ for Claude Code**
