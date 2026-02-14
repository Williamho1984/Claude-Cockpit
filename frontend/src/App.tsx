import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleCard } from './components/RoleCard';
import { Terminal, TerminalHandle } from './components/Terminal';
import { HistoryPanel } from './components/HistoryPanel';

interface RoleStatus {
    id: string;
    title: string;
    status: 'RUNNING' | 'DONE' | 'IDLE';
    progress: number;
    color: string;
}

interface HistoryItem {
    id: string;
    command: string;
    timestamp: string;
}

interface SystemHealth {
    cpuPercent: number;
    memPercent: number;
    claudeActive: boolean;
    lastSeen: number;
}

function App() {
    const [roles, setRoles] = useState<RoleStatus[]>([
        { id: 'pm', title: 'PM', status: 'IDLE', progress: 0, color: 'border-purple-500' },
        { id: 'rd', title: 'RD', status: 'IDLE', progress: 0, color: 'border-blue-500' },
        { id: 'ui', title: 'UI', status: 'IDLE', progress: 0, color: 'border-green-500' },
        { id: 'test', title: 'TEST', status: 'IDLE', progress: 0, color: 'border-yellow-500' },
        { id: 'sec', title: 'SEC', status: 'IDLE', progress: 0, color: 'border-red-500' },
    ]);

    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [healthAlert, setHealthAlert] = useState(false);
    const terminalRef = useRef<TerminalHandle>(null);
    const lastHeartbeatRef = useRef(0);

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    useEffect(() => {
        const socket: Socket = io(socketUrl);

        socket.on('status-update', (data: { role?: string; status?: string; title?: string }) => {
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
        });

        // 接收心跳資料
        socket.on('heartbeat', (data: { cpuPercent: number; memPercent: number; claudeActive: boolean }) => {
            lastHeartbeatRef.current = Date.now();
            setHealth({ ...data, lastSeen: lastHeartbeatRef.current });
            setHealthAlert(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [socketUrl]);

    // 心跳超時監控：30 秒無回應視為異常（用 ref 避免 stale closure）
    useEffect(() => {
        const timer = setInterval(() => {
            if (lastHeartbeatRef.current > 0 && Date.now() - lastHeartbeatRef.current > 30_000) {
                setHealthAlert(true);
            }
        }, 5_000);
        return () => clearInterval(timer);
    }, []);

    const handleCommand = useCallback((command: string, timestamp: string) => {
        setHistoryItems(prev => {
            const newItem: HistoryItem = {
                id: `${Date.now()}`,
                command,
                timestamp,
            };
            return [newItem, ...prev].slice(0, 100);
        });
    }, []);

    const handleHistoryItemClick = useCallback((command: string) => {
        terminalRef.current?.submitCommand(command);
    }, []);

    return (
        <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono">
            {/* 頂部標題 */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Claude Cockpit</h1>
                    <p className="text-xs text-gray-400">Professional Web UI for Claude Code</p>
                </div>

                {/* 系統健康指示器 */}
                {health && (
                    <div className={`text-[10px] px-3 py-1.5 rounded border flex items-center gap-3 ${
                        healthAlert
                            ? 'border-red-600 bg-red-950/50 text-red-400'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}>
                        {/* 連線燈 */}
                        <span className={`w-2 h-2 rounded-full ${healthAlert ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />

                        <span>CPU {health.cpuPercent.toFixed(1)}%</span>
                        <span>MEM {health.memPercent.toFixed(1)}%</span>

                        {/* Claude 活躍度燈 */}
                        <span className="flex items-center gap-1 border-l border-slate-600 pl-3">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                health.claudeActive
                                    ? 'bg-emerald-400 animate-pulse'
                                    : 'bg-red-500'
                            }`} />
                            <span className={health.claudeActive ? 'text-emerald-400' : 'text-red-400'}>
                                {health.claudeActive ? 'ALIVE' : 'OFFLINE'}
                            </span>
                        </span>

                        {healthAlert && <span className="text-red-400 font-bold border-l border-slate-600 pl-3">⚠ 失聯</span>}
                    </div>
                )}
            </div>

            {/* 頂部角色卡片區 */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                {roles.map(role => (
                    <RoleCard
                        key={role.id}
                        title={role.title}
                        status={role.status}
                        progress={role.progress}
                        color={role.color}
                    />
                ))}
            </div>

            {/* 中央主終端區 */}
            <div className="grid grid-cols-4 gap-4 h-[600px]">
                <div className="col-span-3 bg-slate-950 border border-slate-800 rounded p-2 overflow-hidden flex flex-col">
                    <Terminal ref={terminalRef} onCommand={handleCommand} />
                </div>

                {/* 右側資訊欄 */}
                <div className="col-span-1">
                    <HistoryPanel items={historyItems} onItemClick={handleHistoryItemClick} />
                </div>
            </div>

            {/* 底部狀態列 */}
            <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
                <div>
                    <span className="mr-4">Server: localhost:3001</span>
                    <span>Frontend: localhost:5173</span>
                </div>
                <div>
                    <span>Claude Cockpit v1.0.0</span>
                </div>
            </div>
        </div>
    );
}

export default App;
