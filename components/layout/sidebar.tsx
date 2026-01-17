"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, PanelLeftClose, PanelLeft, Check, X } from "lucide-react";
import { useDecisionStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SidebarProps {
    onLogoClick?: () => void;
    onSessionSelect?: () => void;
}

export function Sidebar({ onLogoClick, onSessionSelect }: SidebarProps) {
    const {
        sessions,
        currentSessionId,
        setCurrentSessionId,
        createNewSession,
        deleteSession,
        renameSession,
        toggleSettings,
        sidebarCollapsed,
        toggleSidebar
    } = useDecisionStore();

    // 编辑状态
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // 聚焦输入框
    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    // 开始编辑
    const startEditing = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditValue(currentTitle);
    };

    // 保存编辑
    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            renameSession(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue("");
    };

    // 取消编辑
    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    // 键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            saveEdit();
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    };

    return (
        <aside className={cn(
            "h-full flex flex-col transition-all duration-300 ease-in-out bg-transparent",
            sidebarCollapsed ? "w-[72px] p-3" : "w-[280px] p-5"
        )}>
            {/* Header */}
            <div className={cn(
                "flex items-center mb-6",
                sidebarCollapsed ? "flex-col gap-3" : "justify-between"
            )}>
                <div 
                    className={cn(
                        "flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
                        sidebarCollapsed ? "justify-center" : "px-1 py-2"
                    )}
                    onClick={onLogoClick}
                    title="返回首页"
                >
                    {/* Logo Image */}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative mix-blend-multiply">
                        <img 
                            src="/logo-light.png" 
                            alt="智镜 PRISM" 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-lg whitespace-nowrap tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight">
                                智镜 PRISM
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold opacity-80">
                                Decision Assistant
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-xl hover:bg-white/40 text-slate-400 hover:text-slate-600 transition-all hover:scale-105"
                    title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                    {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>

            {/* New Session Button - Capsule Gradient */}
            <button
                onClick={() => createNewSession()}
                className={cn(
                    "btn-sapphire flex items-center justify-center gap-2 active:scale-95 transition-all",
                    sidebarCollapsed ? "w-8 h-8 rounded-full mb-4 mx-auto" : "w-auto mx-4 h-12 rounded-full mb-6 font-bold text-sm"
                )}
                title="新建决策"
            >
                <span className={sidebarCollapsed ? "text-base" : "text-lg"}>+</span>
                {!sidebarCollapsed && <span>新建决策</span>}
            </button>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {!sidebarCollapsed && (
                    <div className="text-[10px] font-bold text-slate-400 px-3 mb-2 uppercase tracking-[0.2em]">历史记录</div>
                )}
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        onClick={() => {
                            if (editingId !== session.id) {
                                setCurrentSessionId(session.id);
                                onSessionSelect?.();
                            }
                        }}
                        onDoubleClick={() => {
                            if (!sidebarCollapsed) {
                                startEditing(session.id, session.title);
                            }
                        }}
                        className={cn(
                            "group relative flex items-center gap-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden border border-transparent",
                            currentSessionId === session.id
                                ? "text-slate-700"
                                : "text-slate-400/70 hover:text-slate-500 hover:bg-white/20",
                            sidebarCollapsed ? "justify-center p-2.5" : "p-3"
                        )}
                        title={sidebarCollapsed ? session.title : "双击重命名"}
                    >
                        {!sidebarCollapsed && (
                            <>
                                {editingId === session.id ? (
                                    // 编辑模式
                                    <div className="flex-1 flex items-center gap-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onBlur={saveEdit}
                                            className="flex-1 text-sm bg-white/60 border border-sky-200 rounded-lg px-2 py-1 outline-none focus:border-sky-400 text-slate-700"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                saveEdit();
                                            }}
                                            className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-all"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelEdit();
                                            }}
                                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    // 显示模式
                                    <>
                                        <span className={cn(
                                            "text-sm truncate flex-1 transition-all duration-300",
                                            currentSessionId === session.id
                                                ? "text-sky-600 font-semibold tracking-tight"
                                                : "font-medium"
                                        )}>
                                            {session.title}
                                        </span>

                                        {sessions.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("确定要删除这个决策吗？")) {
                                                        deleteSession(session.id);
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50/60 hover:text-rose-500 transition-all ml-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* User Settings */}
            <div className="pt-4 border-t border-slate-200/50 mt-auto">
                <div
                    onClick={() => toggleSettings(true)}
                    className={cn(
                        "flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 cursor-pointer transition-colors active:scale-95",
                        sidebarCollapsed && "justify-center"
                    )}
                    title={sidebarCollapsed ? "用户设置" : undefined}
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <span className="text-xs">U</span>
                    </div>
                    {!sidebarCollapsed && (
                        <div className="text-sm font-medium text-slate-600">用户设置</div>
                    )}
                </div>
            </div>
        </aside>
    );
}
