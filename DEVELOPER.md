# Claude Cockpit UI - 開發者指南

## 專案架構

### 技術棧

**前端**
- React 18.2 - UI 框架
- TypeScript 5.3 - 型別安全
- Vite 5.0 - 建置工具
- Tailwind CSS 3.4 - 樣式框架
- Xterm.js 5.3 - 終端機渲染
- Socket.io-client 4.6 - WebSocket 客戶端

**後端**
- Node.js - 執行環境
- node-pty 0.10 - 虛擬終端機
- Socket.io 4.6 - WebSocket 伺服器

### 目錄結構

```
Claude Cockpit/
├── backend/                    # 後端程式碼
│   ├── server.js              # 主伺服器
│   └── package.json           # 後端依賴
├── frontend/                   # 前端程式碼
│   ├── src/
│   │   ├── App.tsx           # 主應用程式
│   │   ├── main.tsx          # 入口點
│   │   ├── index.css         # 全域樣式
│   │   └── components/       # UI 組件
│   │       ├── RoleCard.tsx
│   │       ├── Terminal.tsx
│   │       └── HistoryPanel.tsx
│   ├── public/               # 靜態資源
│   └── package.json          # 前端依賴
├── docs/                      # 文件
│   └── implementation_plan.md
├── config.json               # 專案配置
├── start.ps1                 # Windows 啟動腳本
├── start.sh                  # Bash 啟動腳本
└── README.md                 # 專案說明
```

## 核心功能

### 1. WebSocket 通訊

**後端 (server.js)**
```javascript
io.on('connection', (socket) => {
  // 建立虛擬終端機
  const ptyProcess = pty.spawn(BASH_PATH, [], {...});
  
  // 監聽終端輸出
  ptyProcess.onData((data) => {
    socket.emit('output', data);
    parseStatus(data, socket);  // 狀態解析
  });
  
  // 接收前端輸入
  socket.on('input', (data) => {
    ptyProcess.write(data);
  });
});
```

**前端 (Terminal.tsx)**
```typescript
const socket = io('http://localhost:3001');

socket.on('output', (data) => {
  xterm.write(data);  // 寫入終端機
});

xterm.onData((data) => {
  socket.emit('input', data);  // 發送輸入
});
```

### 2. 狀態解析

後端會分析終端輸出，根據關鍵字自動更新角色狀態：

```javascript
function parseStatus(data, socket) {
  // 檢查角色關鍵字
  roles.forEach(role => {
    if (data.includes(role.keyword)) {
      socket.emit('status-update', { 
        role: role.id, 
        status: 'RUNNING' 
      });
    }
  });
}
```

### 3. UI 組件

**RoleCard** - 角色狀態卡片
- 顯示角色名稱與狀態
- 動態進度條
- 狀態顏色變化（IDLE/RUNNING/DONE）

**Terminal** - 終端機組件
- Xterm.js 渲染
- 連線狀態指示器
- 完整配色方案
- 自動調整大小

**HistoryPanel** - 歷史記錄
- 指令歷史列表
- 點擊重新執行
- 選中狀態動畫

## 開發流程

### 1. 安裝依賴

```bash
# 後端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 2. 開發模式

**後端（自動重啟）**
```bash
cd backend
npm run dev  # 使用 nodemon
```

**前端（熱模組替換）**
```bash
cd frontend
npm run dev  # Vite HMR
```

### 3. 建置生產版本

```bash
cd frontend
npm run build
# 輸出到 frontend/dist/
```

## 配置說明

### config.json

```json
{
  "backend": {
    "port": 3001,
    "bashPath": "C:\\Program Files\\Git\\bin\\bash.exe",
    "terminal": {
      "cols": 80,
      "rows": 30
    }
  },
  "frontend": {
    "port": 5173,
    "socketUrl": "http://localhost:3001",
    "theme": {
      "background": "#020617",
      "foreground": "#34d399"
    }
  },
  "roles": [
    {
      "id": "pm",
      "title": "PM",
      "color": "border-purple-500",
      "keywords": ["[PM]", "planning"]
    }
  ]
}
```

### 自訂角色

編輯 `config.json` 中的 `roles` 陣列：

```json
{
  "id": "custom",        // 唯一識別碼
  "title": "CUSTOM",     // 顯示名稱
  "color": "border-orange-500",  // Tailwind 顏色
  "keywords": ["[CUSTOM]", "custom task"]  // 觸發關鍵字
}
```

### 自訂狀態關鍵字

```json
{
  "statusKeywords": {
    "running": ["Thinking...", "Processing..."],
    "done": ["[DONE]", "Completed"],
    "idle": ["Waiting", "Ready"]
  }
}
```

## 擴展功能

### 新增 UI 組件

1. 在 `frontend/src/components/` 建立新組件
2. 使用 TypeScript 定義 props 介面
3. 在 `App.tsx` 中引入並使用

範例：
```typescript
// components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  data: string;
}

export const NewComponent: React.FC<NewComponentProps> = ({ data }) => {
  return <div>{data}</div>;
};
```

### 新增後端事件

在 `server.js` 中新增事件監聽：

```javascript
socket.on('custom-event', (data) => {
  // 處理自訂事件
  socket.emit('custom-response', result);
});
```

### 修改配色

編輯 `frontend/tailwind.config.js`：

```javascript
theme: {
  extend: {
    colors: {
      custom: {
        500: '#your-color',
      },
    },
  },
}
```

## 除錯技巧

### 1. 檢查 WebSocket 連線

開啟瀏覽器開發者工具 → Network → WS

### 2. 查看後端日誌

```bash
cd backend
npm start
# 觀察終端輸出
```

### 3. 前端除錯

在組件中使用 `console.log`：

```typescript
useEffect(() => {
  console.log('Component mounted');
}, []);
```

### 4. 檢查 port 佔用

```powershell
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

## 常見問題

### Q: 如何修改終端機配色？

A: 編輯 `frontend/src/components/Terminal.tsx` 中的 `theme` 物件。

### Q: 如何新增更多角色？

A: 編輯 `config.json` 中的 `roles` 陣列，並在 `App.tsx` 中更新 `grid-cols-X` 的數字。

### Q: 如何自訂歡迎訊息？

A: 編輯 `Terminal.tsx` 中的歡迎訊息部分。

### Q: 如何整合 Claude Code？

A: 確保 `config.json` 中的 `bashPath` 正確，Claude Code 會在終端機中執行。

## 效能優化

### 1. 減少重新渲染

使用 `React.memo` 包裝組件：

```typescript
export const RoleCard = React.memo<RoleCardProps>(({ ... }) => {
  // ...
});
```

### 2. 優化 WebSocket 事件

避免頻繁發送狀態更新，使用節流（throttle）：

```javascript
let lastUpdate = 0;
const THROTTLE_MS = 100;

ptyProcess.onData((data) => {
  const now = Date.now();
  if (now - lastUpdate > THROTTLE_MS) {
    socket.emit('output', data);
    lastUpdate = now;
  }
});
```

### 3. 限制終端機歷史

在 `Terminal.tsx` 中設定 `scrollback`：

```typescript
const xterm = new XTerm({
  scrollback: 1000,  // 限制為 1000 行
});
```

## 測試

### 單元測試（待實作）

建議使用 Vitest + React Testing Library：

```bash
npm install -D vitest @testing-library/react
```

### 整合測試

1. 啟動後端與前端
2. 開啟瀏覽器訪問 `http://localhost:5173`
3. 在終端機輸入指令測試
4. 觀察狀態卡片更新

## 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

MIT License
