import React from 'react';

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
    // 根據狀態決定顯示樣式
    const getStatusColor = () => {
        switch (status) {
            case 'RUNNING':
                return 'text-yellow-400 animate-pulse';
            case 'DONE':
                return 'text-green-400';
            case 'IDLE':
                return 'text-gray-400';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className={`border-t-2 ${color} bg-slate-900 p-4 rounded-b shadow-lg transition-all duration-300 hover:shadow-xl`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white">{title}</span>
                <span className={`text-[10px] ${getStatusColor()}`}>
                    #{status}
                </span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-1 rounded-full ${color.replace('border', 'bg')} transition-all duration-500 ease-out`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
