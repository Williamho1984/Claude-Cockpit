import React, { useState } from 'react';

interface HistoryItem {
    id: string;
    command: string;
    timestamp: string;
}

interface HistoryPanelProps {
    items?: HistoryItem[];
    onItemClick?: (command: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
    items = [],
    onItemClick
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const defaultItems: HistoryItem[] = [
        { id: '1', command: '> logic: implement auth', timestamp: '10:30' },
        { id: '2', command: '> ui: fix layout issues', timestamp: '10:25' },
        { id: '3', command: '> test: run unit tests', timestamp: '10:20' },
        { id: '4', command: '> security: audit code', timestamp: '10:15' },
        { id: '5', command: '> deploy: build production', timestamp: '10:10' },
    ];

    const displayItems = items.length > 0 ? items : defaultItems;

    const handleItemClick = (item: HistoryItem) => {
        setSelectedId(item.id);
        onItemClick?.(item.command);

        // 清除選中狀態
        setTimeout(() => setSelectedId(null), 500);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs h-full overflow-y-auto">
            <h3 className="text-white border-b border-slate-700 pb-2 mb-3 font-bold flex items-center justify-between">
                <span>歷史記錄</span>
                <span className="text-[10px] text-gray-500 font-normal">
                    {displayItems.length} 項
                </span>
            </h3>
            <ul className="space-y-2">
                {displayItems.map((item) => (
                    <li
                        key={item.id}
                        className={`
                            p-2 rounded
                            opacity-70 hover:opacity-100 
                            hover:bg-slate-800
                            cursor-pointer 
                            transition-all duration-200
                            ${selectedId === item.id ? 'bg-slate-700 opacity-100' : ''}
                        `}
                        onClick={() => handleItemClick(item)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-emerald-400 text-[11px] leading-tight">
                                {item.command}
                            </span>
                        </div>
                        <div className="text-gray-500 text-[10px]">
                            {item.timestamp}
                        </div>
                    </li>
                ))}
            </ul>

            {displayItems.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                    <p className="text-xs">尚無歷史記錄</p>
                </div>
            )}
        </div>
    );
};
