這是一份針對您的需求量身打造的開發指南。這份文件將引導您利用 Node.js、React 與 Tailwind CSS，在 Windows 環境下建構出一個類似「Claude Cockpit」的現代化 Web UI 控制台，並透過 WebSocket 與底層的 Claude Code 進行溝通。

您可以直接複製以下內容並儲存為 Claude_Cockpit_Dev_Guide.md。


Claude Cockpit UI 開發技術指南
本指南旨在協助開發者在 Windows 環境下，利用 Web 技術棧為執行於 Git Bash 的 Claude Code 打造一個專業的儀表板介面。

1. 系統架構設計
   為了達成截圖中複雜的 UI 效果，建議採用 Client-Server 混合架構：

   Frontend (UI 層): 使用 React + Tailwind CSS 負責繪製卡片、進度條與終端機視窗。

   Backend (執行層): 使用 Node.js 透過 node-pty 開啟虛擬終端，直接驅動 Windows 上的 claude.exe。

   Communication (通訊層): 使用 Socket.io 達成前端與後端指令輸出的即時同步。



2.組件,推薦技術,說明
  框架,Vite + React,快速建構前端環境。
  樣式,Tailwind CSS,輕鬆達成暗色模式與螢光色系配對。
  終端渲染,Xterm.js,在網頁上完美模擬 Git Bash 終端輸出。
  後端核心,node-pty,關鍵元件：在 Node.js 中模擬具備交互能力的終端機。
  即時通訊,Socket.io,確保 AI 回覆時能像打字機一樣即時呈現。

3.具體開發步驟
第一步：環境準備
確保您的 Windows 已安裝 Node.js。由於 node-pty 在 Windows 上需要編譯工具，請先執行：
npm install --global windows-build-tools

第二步：建立後端伺服器 (server.js)
後端的主要任務是捕捉 Claude Code 的輸出並轉發給網頁。

JavaScript
const pty = require('node-pty');
const io = require('socket.io')(3001);

// 在 Windows 上開啟 Git Bash 或 CMD
const shell = 'bash.exe'; 

io.on('connection', (socket) => {
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    env: process.env,
  });

  // 監聽終端輸出並發送到前端
  ptyProcess.onData((data) => {
    socket.emit('output', data);
  });

  // 接收前端輸入並寫入終端
  socket.on('input', (data) => {
    ptyProcess.write(data);
  });
});

第三步：前端 UI 佈局 (App.tsx)
使用 Tailwind CSS 模仿截圖中的五個角色狀態卡片。

TypeScript
// 簡化的卡片組件
const RoleCard = ({ title, status, color }) => (
  <div className={`border-t-2 ${color} bg-slate-900 p-4 rounded-b shadow-lg`}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-bold text-white">{title}</span>
      <span className="text-[10px] text-gray-400">#RUNNING</span>
    </div>
    <div className="h-1 w-full bg-gray-800 rounded-full">
      <div className={`h-1 rounded-full ${color.replace('border', 'bg')}`} style={{width: '60%'}}></div>
    </div>
  </div>
);

// 主介面佈局
export default function App() {
  return (
    <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono">
      {/* 頂部卡片區 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <RoleCard title="PM" color="border-purple-500" />
        <RoleCard title="RD" color="border-blue-500" />
        <RoleCard title="UI" color="border-green-500" />
        <RoleCard title="TEST" color="border-yellow-500" />
        <RoleCard title="SEC" color="border-red-500" />
      </div>

      {/* 中央主終端區 */}
      <div className="grid grid-cols-4 gap-4 h-[600px]">
        <div className="col-span-3 bg-slate-950 border border-slate-800 rounded p-2 overflow-hidden">
          {/* 這裡掛載 Xterm.js 實例 */}
          <div id="terminal-container"></div>
        </div>
        
        {/* 右側資訊欄 */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded p-4 text-xs">
          <h3 className="text-white border-b border-slate-700 pb-2 mb-2">歷史記錄</h3>
          <ul className="space-y-2 opacity-70">
            <li>> logic: implement auth</li>
            <li>> ui: fix layout issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


第四步：整合 Xterm.js
在前端安裝 xterm 及其套件，讓您的 Web 介面可以像真正的終端機一樣接受輸入與顯示彩色文字。


4. 關鍵細節優化 (UI/UX)
配色方案 (Palette):

背景色：#020617 (Slate-950)

卡片背景：#0f172a (Slate-900)

文字主色：#34d399 (Emerald-400)

字體: 務必使用 JetBrains Mono 或 Fira Code，這會讓介面的工程師感提升 100%。

狀態同步: 您可以分析 Claude Code 的輸出（例如關鍵字 [DONE] 或 Thinking...），利用正則表達式捕捉後，即時更新上方的 React 狀態卡片。

5. 部署方式
如果您希望像一般軟體一樣點開即用，請使用 Electron 將此專案包裝成 .exe。

npm install electron

將前端與後端程式碼整合進 Electron 的主進程與渲染進程中。

提示： 由於 Windows 環境的路徑與 Git Bash 執行檔位置各異，請在 node-pty 配置中確認 bash.exe 的正確路徑（通常在 C:\Program Files\Git\bin\bash.exe）。