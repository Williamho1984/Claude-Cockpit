// 此檔案包含需要手動套用的程式碼修復補丁

// ============================================
// 補丁 1: backend/server.js - 新增節流機制
// ============================================
// 在第 118 行之前新增以下程式碼：

let lastStatusUpdate = 0;
const THROTTLE_MS = 100;

// 然後修改 parseStatus 函數的開頭：
function parseStatus(data, socket) {
    // 節流：避免過度觸發
    const now = Date.now();
    if (now - lastStatusUpdate < THROTTLE_MS) {
        return;
    }
    lastStatusUpdate = now;

    // ... 其餘程式碼保持不變
}

// ============================================
// 補丁 2: frontend/src/App.tsx - 改善 Socket 管理
// ============================================
// 在 function App() 中新增狀態：

const [isConnected, setIsConnected] = useState(false);
const [connectionError, setConnectionError] = useState < string | null > (null);

// 修改 useEffect 內容：

useEffect(() => {
    const socket: Socket = io('http://localhost:3001');

    // 連線成功
    socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
    });

    // 連線斷開
    socket.on('disconnect', () => {
        setIsConnected(false);
    });

    // 連線錯誤
    socket.on('connect_error', (error) => {
        setIsConnected(false);
        setConnectionError('無法連接到後端伺服器，請確認後端已啟動');
    });

    // 後端錯誤
    socket.on('error', (data: { message: string }) => {
        setConnectionError(data.message);
    });

    // 狀態更新處理函數
    const handleStatusUpdate = (data: { role?: string; status?: string; title?: string }) => {
        if (data.role) {
            setRoles(prevRoles =>
                prevRoles.map(role =>
                    role.id === data.role
                        ? {
                            ...role,
                            status: (data.status as 'RUNNING' | 'DONE' | 'IDLE') || role.status,
                            progress: data.status === 'RUNNING' ? 60 : data.status === 'DONE' ? 100 : 0
                        }
                        : role
                )
            );
        }
    };

    socket.on('status-update', handleStatusUpdate);

    // 清理函數
    return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('error');
        socket.off('status-update', handleStatusUpdate);
        socket.disconnect();
    };
}, []);

// 在 return 的 JSX 中，在標題後新增連線狀態顯示：

{/* 連線狀態警告 */ }
{
    !isConnected && (
        <div className="bg-red-900/50 border border-red-500 text-red-400 p-3 rounded mb-4 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
                <div className="font-bold">未連接到伺服器</div>
                {connectionError && <div className="text-xs mt-1">{connectionError}</div>}
            </div>
        </div>
    )
}

{/* 連線成功提示 */ }
{
    isConnected && (
        <div className="bg-green-900/30 border border-green-500 text-green-400 p-2 rounded mb-4 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>已連接到伺服器</span>
        </div>
    )
}

// ============================================
// 補丁 3: 建立環境變數檔案
// ============================================
// 在專案根目錄建立 .env 檔案：

ALLOWED_ORIGINS = http://localhost:5173
NODE_ENV = development

// ============================================
// 套用說明
// ============================================
// 1. 後端節流機制：已在程式碼審查中識別，建議手動套用
// 2. 前端 Socket 管理：改善記憶體洩漏問題，建議手動套用
// 3. 環境變數：可選，用於生產環境配置

// 注意：部分修復已自動套用到 backend/server.js
// 包含：錯誤處理、CORS 改善、日誌優化
