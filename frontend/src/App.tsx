import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleCard } from './components/RoleCard';
import { Terminal } from './components/Terminal';
import { HistoryPanel } from './components/HistoryPanel';

interface RoleStatus {
    id: string;
    title: string;
    status: 'RUNNING' | 'DONE' | 'IDLE';
    progress: number;
    color: string;
}

function App() {
    const [roles, setRoles] = useState<RoleStatus[]>([
        { id: 'pm', title: 'PM', status: 'IDLE', progress: 0, color: 'border-purple-500' },
        { id: 'rd', title: 'RD', status: 'IDLE', progress: 0, color: 'border-blue-500' },
        { id: 'ui', title: 'UI', status: 'IDLE', progress: 0, color: 'border-green-500' },
        { id: 'test', title: 'TEST', status: 'IDLE', progress: 0, color: 'border-yellow-500' },
        { id: 'sec', title: 'SEC', status: 'IDLE', progress: 0, color: 'border-red-500' },
    ]);

    useEffect(() => {
        const socket: Socket = io('http://localhost:3001');

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

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono">
            {/* 頂部標題 */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-white mb-1">Claude Cockpit</h1>
                <p className="text-xs text-gray-400">Professional Web UI for Claude Code</p>
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
                <div className="col-span-3 bg-slate-950 border border-slate-800 rounded p-2 overflow-hidden">
                    <Terminal />
                </div>

                {/* 右側資訊欄 */}
                <div className="col-span-1">
                    <HistoryPanel />
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
