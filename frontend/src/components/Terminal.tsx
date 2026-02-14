import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

const HISTORY_STORAGE_KEY = 'claude-cockpit-cmd-history';
const MAX_HISTORY = 100;

interface TerminalProps {
    socketUrl?: string;
    onCommand?: (command: string, timestamp: string) => void;
}

export interface TerminalHandle {
    submitCommand: (command: string) => void;
}

function loadHistory(): string[] {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(history: string[]): void {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {
        // localStorage 寫入失敗時靜默忽略
    }
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(({
    socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
    onCommand
}, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // 命令輸入框狀態
    const [inputValue, setInputValue] = useState('');
    const [, setCmdHistory] = useState<string[]>(loadHistory);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        const xterm = new XTerm({
            theme: {
                background: '#020617',
                foreground: '#34d399',
                cursor: '#34d399',
                selectionBackground: '#1e293b',
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

        xterm.writeln('\x1b[1;32m╔══════════════════════════════════════════╗\x1b[0m');
        xterm.writeln('\x1b[1;32m║     Claude Cockpit Terminal v1.0.0      ║\x1b[0m');
        xterm.writeln('\x1b[1;32m╚══════════════════════════════════════════╝\x1b[0m');
        xterm.writeln('');

        const socket = io(socketUrl);

        socket.on('connect', () => {
            setIsConnected(true);
            xterm.writeln('\x1b[1;32m✓ Connected to server\x1b[0m');
            xterm.writeln('');
        });

        socket.on('output', (data: string) => {
            xterm.write(data);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            xterm.writeln('');
            xterm.writeln('\x1b[1;31m✗ Disconnected from server\x1b[0m');
        });

        socket.on('connect_error', () => {
            setIsConnected(false);
            xterm.writeln('');
            xterm.writeln('\x1b[1;31m✗ Connection error - Please check if backend is running\x1b[0m');
        });

        xterm.onData((data) => {
            socket.emit('input', data);
        });

        const handleResize = () => {
            fitAddon.fit();
            socket.emit('resize', { cols: xterm.cols, rows: xterm.rows });
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

    const submitCommand = useCallback((cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed || !socketRef.current?.connected) return;

        // 送出命令到終端（加上換行）
        socketRef.current.emit('input', trimmed + '\r');

        // 更新歷史記錄（去重後加到最前）
        setCmdHistory(prev => {
            const filtered = prev.filter(c => c !== trimmed);
            const next = [trimmed, ...filtered].slice(0, MAX_HISTORY);
            saveHistory(next);
            return next;
        });

        // 通知父元件記錄命令
        const ts = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        onCommand?.(trimmed, ts);

        setInputValue('');
        setHistoryIndex(-1);

        // 讓焦點回到輸入框
        inputRef.current?.focus();
    }, [onCommand]);

    useImperativeHandle(ref, () => ({ submitCommand }), [submitCommand]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            submitCommand(inputValue);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCmdHistory(prev => {
                const nextIdx = Math.min(historyIndex + 1, prev.length - 1);
                setHistoryIndex(nextIdx);
                setInputValue(prev[nextIdx] ?? '');
                return prev;
            });
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = historyIndex - 1;
            if (nextIdx < 0) {
                setHistoryIndex(-1);
                setInputValue('');
            } else {
                setHistoryIndex(nextIdx);
                setCmdHistory(prev => {
                    setInputValue(prev[nextIdx] ?? '');
                    return prev;
                });
            }
        }
    }, [inputValue, historyIndex, submitCommand]);

    return (
        <div className="relative flex flex-col h-full w-full">
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
            <div ref={terminalRef} className="flex-1 min-h-0 w-full" />

            {/* 命令輸入框 */}
            <div className="flex items-center gap-2 border-t border-slate-700 bg-slate-900 px-3 py-2 mt-1">
                <span className="text-emerald-400 text-xs select-none">›</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入命令後按 Enter 送出（↑↓ 瀏覽歷史）"
                    spellCheck={false}
                    autoComplete="off"
                    className="
                        flex-1 bg-transparent text-emerald-300 text-xs
                        outline-none placeholder-slate-600
                        font-mono
                    "
                />
                <button
                    onClick={() => submitCommand(inputValue)}
                    disabled={!inputValue.trim() || !isConnected}
                    className="
                        text-[10px] px-2 py-0.5 rounded
                        bg-emerald-800/50 text-emerald-400
                        disabled:opacity-30 disabled:cursor-not-allowed
                        hover:bg-emerald-700/50 transition-colors
                    "
                >
                    送出
                </button>
            </div>
        </div>
    );
});

Terminal.displayName = 'Terminal';
