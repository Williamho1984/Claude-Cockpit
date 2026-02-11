# Claude Cockpit UI 實作計畫

本計畫旨在根據 `Claude_Cockpit_Dev_Guide.md` 開發指南，建構一個專業的 Web UI 控制台，用於在 Windows 環境下與 Claude Code 進行互動。

## 專案概述

**目標**：建立一個現代化的 Web UI 儀表板，透過 WebSocket 即時通訊與底層的 `claude.exe` 進行溝通，提供視覺化的多角色狀態監控與終端機互動介面。

**核心價值**：
- 提供直觀的視覺化介面，取代傳統命令列操作
- 即時顯示 AI 回應與執行狀態
- 支援多角色（PM、RD、UI、TEST、SEC）狀態追蹤
- 提供類似專業開發工具的使用體驗

## 使用者審核要點

> [!IMPORTANT]
> **技術棧選擇**
> 
> 本專案將使用以下技術棧：
> - **前端**：Vite + React + TypeScript + Tailwind CSS
> - **後端**：Node.js + node-pty + Socket.io
> - **終端渲染**：Xterm.js
> - **部署方式**：Electron（可選，用於打包成 .exe）
> 
> 請確認此技術選擇符合您的需求。

> [!WARNING]
> **Windows 環境依賴**
> 
> 本專案需要在 Windows 環境下安裝編譯工具（`windows-build-tools`），因為 `node-pty` 需要原生模組編譯。這可能需要管理員權限。

> [!IMPORTANT]
> **Git Bash 路徑配置**
> 
> 專案需要正確配置 Git Bash 的執行檔路徑（通常為 `C:\Program Files\Git\bin\bash.exe`）。請確認您的系統中已安裝 Git for Windows。

---

## 提議變更

### 第一階段：環境準備與專案初始化

#### 環境檢查與安裝

**目標**：確保開發環境具備所有必要的工具與依賴

1. **檢查 Node.js 版本**
   - 確認 Node.js >= 16.x
   - 確認 npm >= 8.x

2. **安裝 Windows 編譯工具**
   ```bash
   npm install --global windows-build-tools
   ```

3. **確認 Git Bash 路徑**
   - 檢查 `C:\Program Files\Git\bin\bash.exe` 是否存在
   - 若路徑不同，需記錄實際路徑供後續使用

#### 專案目錄結構初始化

在 `e:/何偉豪/Claude Cockpit` 建立以下結構：

```
Claude Cockpit/
├── backend/              # Node.js 後端
│   ├── server.js        # 主伺服器程式
│   ├── package.json
│   └── node_modules/
├── frontend/            # React 前端
│   ├── src/
│   │   ├── App.tsx     # 主應用程式
│   │   ├── components/ # UI 組件
│   │   ├── main.tsx    # 入口點
│   │   └── index.css   # Tailwind 樣式
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── docs/               # 文件
    └── Claude_Cockpit_Dev_Guide.md
```

---

### 第二階段：後端開發

#### [NEW] [server.js](file:///e:/何偉豪/Claude%20Cockpit/backend/server.js)

**功能**：
- 使用 `node-pty` 建立虛擬終端機
- 透過 Socket.io 提供 WebSocket 服務
- 捕捉 Claude Code 的輸出並即時轉發
- 接收前端輸入並寫入終端機

**核心實作**：
```javascript
const pty = require('node-pty');
const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' }
});

const BASH_PATH = 'C:\\Program Files\\Git\\bin\\bash.exe';

io.on('connection', (socket) => {
  console.log('Client connected');
  
  const ptyProcess = pty.spawn(BASH_PATH, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  ptyProcess.onData((data) => {
    socket.emit('output', data);
  });

  socket.on('input', (data) => {
    ptyProcess.write(data);
  });

  socket.on('disconnect', () => {
    ptyProcess.kill();
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

#### [NEW] [package.json](file:///e:/何偉豪/Claude%20Cockpit/backend/package.json)

**依賴套件**：
- `node-pty`: ^0.10.1
- `socket.io`: ^4.6.0

---

### 第三階段：前端開發

#### [NEW] [App.tsx](file:///e:/何偉豪/Claude%20Cockpit/frontend/src/App.tsx)

**功能**：
- 主應用程式佈局
- 整合五個角色狀態卡片
- 整合 Xterm.js 終端機
- 整合右側歷史記錄面板

**核心組件**：

1. **RoleCard 組件**
   - 顯示角色名稱（PM、RD、UI、TEST、SEC）
   - 顯示執行狀態（#RUNNING、#DONE 等）
   - 顯示進度條

2. **Terminal 組件**
   - 使用 Xterm.js 渲染終端機
   - 連接 Socket.io 接收輸出
   - 處理使用者輸入

3. **HistoryPanel 組件**
   - 顯示歷史指令記錄
   - 支援點擊重新執行

#### [NEW] [components/RoleCard.tsx](file:///e:/何偉豪/Claude%20Cockpit/frontend/src/components/RoleCard.tsx)

```typescript
interface RoleCardProps {
  title: string;
  status: 'RUNNING' | 'DONE' | 'IDLE';
  progress: number;
  color: string;
}

export const RoleCard: React.FC<RoleCardProps> = ({ 
  title, 
  status, 
  progress, 
  color 
}) => {
  return (
    <div className={`border-t-2 ${color} bg-slate-900 p-4 rounded-b shadow-lg`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-white">{title}</span>
        <span className="text-[10px] text-gray-400">#{status}</span>
      </div>
      <div className="h-1 w-full bg-gray-800 rounded-full">
        <div 
          className={`h-1 rounded-full ${color.replace('border', 'bg')}`} 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
```

#### [NEW] [components/Terminal.tsx](file:///e:/何偉豪/Claude%20Cockpit/frontend/src/components/Terminal.tsx)

```typescript
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';

export const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      theme: {
        background: '#020617',
        foreground: '#34d399',
      },
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    const socket = io('http://localhost:3001');

    socket.on('output', (data) => {
      xterm.write(data);
    });

    xterm.onData((data) => {
      socket.emit('input', data);
    });

    xtermRef.current = xterm;

    return () => {
      socket.disconnect();
      xterm.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="h-full w-full" />;
};
```

#### [NEW] [index.css](file:///e:/何偉豪/Claude%20Cockpit/frontend/src/index.css)

**配色方案**：
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --slate-950: #020617;
  --slate-900: #0f172a;
  --slate-800: #1e293b;
  --slate-700: #334155;
  --emerald-400: #34d399;
}

body {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  background-color: var(--slate-950);
  color: var(--emerald-400);
}
```

#### [NEW] [tailwind.config.js](file:///e:/何偉豪/Claude%20Cockpit/frontend/src/tailwind.config.js)

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        emerald: {
          400: '#34d399',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

#### [NEW] [package.json](file:///e:/何偉豪/Claude%20Cockpit/frontend/package.json)

**依賴套件**：
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `xterm`: ^5.3.0
- `xterm-addon-fit`: ^0.8.0
- `socket.io-client`: ^4.6.0
- `tailwindcss`: ^3.4.0

---

### 第四階段：狀態同步機制

#### 狀態解析邏輯

**目標**：分析 Claude Code 輸出，自動更新角色卡片狀態

**實作方式**：
1. 在後端監聽終端輸出
2. 使用正則表達式匹配關鍵字（如 `[PM]`, `[RD]`, `[DONE]`, `Thinking...`）
3. 透過 Socket.io 發送狀態更新事件
4. 前端接收事件並更新 React 狀態

**範例**：
```javascript
// 後端狀態解析
ptyProcess.onData((data) => {
  socket.emit('output', data);
  
  // 解析狀態
  if (data.includes('[PM]')) {
    socket.emit('status-update', { role: 'PM', status: 'RUNNING' });
  }
  if (data.includes('[DONE]')) {
    socket.emit('status-update', { role: 'PM', status: 'DONE' });
  }
});
```

---

### 第五階段：Electron 打包（可選）

#### [NEW] [main.js](file:///e:/何偉豪/Claude%20Cockpit/main.js)

**功能**：
- Electron 主進程
- 建立視窗
- 整合後端伺服器

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadFile('frontend/dist/index.html');
}

app.whenReady().then(() => {
  // 啟動後端伺服器
  serverProcess = spawn('node', ['backend/server.js']);
  
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});
```

---

## 驗證計畫

### 自動化測試

1. **後端測試**
   ```bash
   # 測試 node-pty 是否正常運作
   node backend/server.js
   # 預期：伺服器在 port 3001 啟動
   ```

2. **前端測試**
   ```bash
   # 測試 Vite 開發伺服器
   cd frontend
   npm run dev
   # 預期：前端在 http://localhost:5173 啟動
   ```

3. **整合測試**
   - 開啟前端頁面
   - 檢查 WebSocket 連線狀態
   - 在終端機輸入指令（如 `ls`）
   - 確認輸出正確顯示

### 手動驗證

1. **UI 視覺檢查**
   - 確認五個角色卡片正確顯示
   - 確認配色符合設計規範（Slate + Emerald）
   - 確認字體為 JetBrains Mono 或 Fira Code

2. **功能驗證**
   - 測試終端機輸入輸出
   - 測試狀態卡片更新
   - 測試歷史記錄功能

3. **效能驗證**
   - 測試長時間執行的穩定性
   - 測試大量輸出的渲染效能

### 使用者驗收測試

請使用者執行以下操作：
1. 啟動應用程式
2. 執行 Claude Code 指令
3. 觀察 UI 回應與狀態更新
4. 確認使用體驗符合預期

---

## 專案時程估計

| 階段 | 預估時間 | 說明 |
|------|---------|------|
| 環境準備 | 1-2 小時 | 安裝工具與初始化專案 |
| 後端開發 | 3-4 小時 | 實作 server.js 與測試 |
| 前端開發 | 6-8 小時 | 實作 UI 組件與整合 Xterm.js |
| 整合測試 | 2-3 小時 | 前後端整合與除錯 |
| 優化部署 | 2-3 小時 | UI 優化與 Electron 打包 |
| **總計** | **14-20 小時** | 約 2-3 個工作天 |

---

## 風險與應對策略

> [!CAUTION]
> **node-pty 編譯問題**
> 
> **風險**：Windows 環境下 `node-pty` 可能編譯失敗
> 
> **應對**：
> - 確保已安裝 `windows-build-tools`
> - 使用 Node.js LTS 版本
> - 若仍失敗，考慮使用預編譯的二進位檔案

> [!WARNING]
> **Git Bash 路徑問題**
> 
> **風險**：不同系統的 Git Bash 路徑可能不同
> 
> **應對**：
> - 在 `server.js` 中加入路徑檢測邏輯
> - 提供設定檔讓使用者自訂路徑

> [!WARNING]
> **WebSocket 連線問題**
> 
> **風險**：防火牆可能阻擋 WebSocket 連線
> 
> **應對**：
> - 確認 port 3001 未被佔用
> - 檢查防火牆設定
> - 提供 CORS 設定選項

---

## 後續擴展建議

1. **多終端機支援**：允許同時開啟多個終端機分頁
2. **指令歷史搜尋**：提供快速搜尋與重新執行功能
3. **主題自訂**：允許使用者自訂配色方案
4. **快捷鍵支援**：提供鍵盤快捷鍵提升效率
5. **日誌匯出**：支援匯出終端機輸出為文字檔

---

## 參考資源

- [node-pty 官方文件](https://github.com/microsoft/node-pty)
- [Xterm.js 官方文件](https://xtermjs.org/)
- [Socket.io 官方文件](https://socket.io/)
- [Tailwind CSS 官方文件](https://tailwindcss.com/)
- [Electron 官方文件](https://www.electronjs.org/)
