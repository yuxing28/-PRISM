"use client";

import React, { useState } from "react";
import { useDecisionStore } from "@/lib/store";
import { X, Key, Trash2, Sparkles, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsModal() {
    const { apiKey, setApiKey, showSettings, toggleSettings, clearAllData } = useDecisionStore();
    const [tempKey, setTempKey] = useState(apiKey);
    const [showKey, setShowKey] = useState(false);

    if (!showSettings) return null;

    const handleSave = () => {
        setApiKey(tempKey);
        toggleSettings(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-500 p-4">
            <div
                className="glass-modal-premium w-full max-w-[440px] p-6 lg:p-10 relative animate-in zoom-in-95 duration-500 pb-8 lg:pb-12"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Area */}
                <div className="flex justify-between items-start mb-6 lg:mb-10">
                    <div className="space-y-1">
                        <h2 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 animate-pulse-slow">
                                <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 fill-current opacity-80" />
                            </div>
                            用户设置
                        </h2>
                        <p className="text-xs text-slate-400 font-medium pl-11">配置您的推演引擎参数</p>
                    </div>

                    <button
                        onClick={() => toggleSettings(false)}
                        className="p-2 hover:bg-white/60 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6 lg:space-y-8">
                    {/* API Key Input Section */}
                    <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-600 px-1 ml-1 flex items-center gap-2">
                            DeepSeek 接口密钥 (API Key)
                        </label>

                        <div className="glass-input-capsule-sm flex items-center rounded-full px-5 py-3 gap-3">
                            <Key className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <input
                                type={showKey ? "text" : "password"}
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                                placeholder="sk-..."
                                className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-200 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="p-1 hover:text-sky-600 transition-colors text-slate-300 hover:text-slate-500"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-medium px-4 leading-relaxed">
                            * 密钥仅加密存储在您的本地浏览器中，绝不会被上传或泄露。
                        </p>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="pt-6 space-y-6">
                        <button
                            onClick={handleSave}
                            className="btn-sapphire w-full py-4 rounded-full font-bold text-sm tracking-widest uppercase shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                        >
                            保存配置
                        </button>

                        <div className="flex flex-col items-center gap-4 border-t border-slate-100/50 pt-6">
                            <button
                                onClick={() => {
                                    if (confirm("确定要清除所有历史记录和设置吗？此操作不可撤销。")) {
                                        clearAllData();
                                    }
                                }}
                                className="text-[11px] font-bold text-slate-300 hover:text-rose-500 transition-colors duration-300"
                            >
                                清除所有本地缓存数据
                            </button>

                            <div className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em]">
                                Prism AI Terminal v1.12.1
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop Overlay */}
            <div
                className="absolute inset-0 -z-10"
                onClick={() => toggleSettings(false)}
            />
        </div>
    );
}
