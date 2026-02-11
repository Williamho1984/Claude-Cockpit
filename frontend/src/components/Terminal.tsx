import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface TerminalProps {
    socketUrl?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
    socketUrl = 'http://localhost:3001'
}) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!terminalRef.current) return;

        // 初始化 Xterm
        const xterm = new XTerm({
            theme: {
                background: '#020617',
                foreground: '#34d399',
                cursor: '#34d399',
                selection: '#1e293b',
                black: '#0f172a',
                red: '#ef4444',
                green: '#34d399',
                yellow: '#fbbf24',
                blue: '#60a5fa',
                magenta: '#a78bfa',
                cyan: '#22d3ee',
                white: '#f1f5f9',
                brightBlack: '#475569',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#fcd34d',
                brightBlue: '#93c5fd',
                brightMagenta: '#c4b5fd',
                brightCyan: '#67e8f9',
                brightWhite: '#ffffff',
            },
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 4,
        });

        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);
        xterm.open(terminalRef.current);
        fitAddon.fit();

        // 顯示歡迎訊息
        xterm.writeln('\x1b[1;32m╔══════════════════════════════════════════╗\x1b[0m');
        xterm.writeln('\x1b[1;32m║     Claude Cockpit Terminal v1.0.0      ║\x1b[0m');
        xterm.writeln('\x1b[1;32m╚══════════════════════════════════════════╝\x1b[0m');
        xterm.writeln('');

        // 連接 Socket.io
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
            xterm.writeln('\x1b[1;32m✓ Connected to server\x1b[0m');
            xterm.writeln('');
        });

        socket.on('output', (data: string) => {
            xterm.write(data);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
            xterm.writeln('');
            xterm.writeln('\x1b[1;31m✗ Disconnected from server\x1b[0m');
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
            xterm.writeln('');
            xterm.writeln('\x1b[1;31m✗ Connection error - Please check if backend is running\x1b[0m');
        });

        // 處理使用者輸入
        xterm.onData((data) => {
            socket.emit('input', data);
        });

        // 處理視窗大小調整
        const handleResize = () => {
            fitAddon.fit();
            socket.emit('resize', {
                cols: xterm.cols,
                rows: xterm.rows
            });
        };

        window.addEventListener('resize', handleResize);

        xtermRef.current = xterm;
        socketRef.current = socket;

        return () => {
            window.removeEventListener('resize', handleResize);
            socket.disconnect();
            xterm.dispose();
        };
    }, [socketUrl]);

    return (
        <div className="relative h-full w-full">
            {/* 連線狀態指示器 */}
            <div className="absolute top-2 right-2 z-10">
                <div className={`
                    flex items-center gap-2 
                    px-2 py-1 
                    rounded 
                    text-[10px] 
                    ${isConnected
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }
                `}>
                    <div className={`
                        w-2 h-2 rounded-full 
                        ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}
                    `} />
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>

            {/* 終端機容器 */}
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};
