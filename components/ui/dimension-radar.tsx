"use client";

import React from "react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { cn } from "@/lib/utils";

interface DimensionRadarProps {
    dimensions: {
        logic: number;
        feasibility: number;
        risk: number;
        value: number;
        timing: number;
        resource: number;
    };
    isDebateMode?: boolean;
    className?: string;
}

const DIMENSION_LABELS: Record<string, string> = {
    logic: '逻辑严密',
    feasibility: '可行性',
    risk: '风险控制',
    value: '价值匹配',
    timing: '时机适当',
    resource: '资源充足'
};

export function DimensionRadar({ dimensions, isDebateMode = false, className }: DimensionRadarProps) {
    const data = Object.entries(dimensions).map(([key, value]) => ({
        dimension: DIMENSION_LABELS[key] || key,
        value: value,
        fullMark: 10
    }));

    const hasData = Object.values(dimensions).some(v => v > 0);
    const fillColor = isDebateMode ? "rgba(244, 63, 94, 0.3)" : "rgba(14, 165, 233, 0.3)";
    const strokeColor = isDebateMode ? "#f43f5e" : "#0ea5e9";

    return (
        <div className={cn("w-full", className)}>
            {hasData ? (
                <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid 
                            stroke="rgba(148, 163, 184, 0.2)" 
                            strokeDasharray="3 3"
                        />
                        <PolarAngleAxis 
                            dataKey="dimension" 
                            tick={{ 
                                fill: '#64748b', 
                                fontSize: 10, 
                                fontWeight: 600 
                            }}
                        />
                        <Radar
                            name="评分"
                            dataKey="value"
                            stroke={strokeColor}
                            fill={fillColor}
                            strokeWidth={2}
                            dot={{ 
                                r: 3, 
                                fill: strokeColor,
                                strokeWidth: 0
                            }}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />
                    </RadarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[200px] flex flex-col items-center justify-center space-y-3 opacity-40">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest">等待多维分析数据...</span>
                </div>
            )}
        </div>
    );
}
