"use client";

import { Sidebar } from "./sidebar";
import { InfoPanel } from "./info-panel";
import { useDecisionStore } from "@/lib/store";
import { Menu, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: React.ReactNode;
    onLogoClick?: () => void;
}

export function MainLayout({ children, onLogoClick }: MainLayoutProps) {
    const { mobileMenuOpen, mobilePanelOpen, toggleMobileMenu, toggleMobilePanel } = useDecisionStore();

    return (
        <div className="flex w-full h-screen max-h-screen overflow-hidden bg-[linear-gradient(135deg,#ECF9FF_0%,#F0F4FF_50%,#F5F3FF_100%)] relative">
            {/* 液态玻璃背景光晕 */}
            <div className="bg-blob bg-blob-1 opacity-70" />
            <div className="bg-blob bg-blob-2 opacity-60" />
            <div className="bg-blob bg-blob-3 opacity-50" />

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 border-b border-white/50 backdrop-blur-xl bg-white/70 z-50">
                <button
                    onClick={() => toggleMobileMenu()}
                    className="p-2 rounded-xl hover:bg-white/50 text-slate-600 transition-all"
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                
                <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
                    <div className="w-8 h-8 rounded-full overflow-hidden mix-blend-multiply">
                        <img src="/logo-light.png" alt="智镜 PRISM" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-slate-800">智镜 PRISM</span>
                </div>

                <button
                    onClick={() => toggleMobilePanel()}
                    className="p-2 rounded-xl hover:bg-white/50 text-slate-600 transition-all"
                >
                    <BarChart3 className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                    onClick={() => toggleMobileMenu(false)}
                />
            )}

            {/* 侧边栏容器 - Desktop: 固定显示, Mobile: 抽屉 */}
            <div className={cn(
                "glass-sidebar h-full relative z-50 flex-shrink-0 transition-transform duration-300",
                "lg:translate-x-0 lg:relative",
                "fixed top-0 left-0",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="lg:hidden h-14" /> {/* Spacer for mobile header */}
                <Sidebar onLogoClick={onLogoClick} onSessionSelect={() => toggleMobileMenu(false)} />
            </div>

            {/* 主内容区域 */}
            <main className="flex-1 flex flex-col h-full relative z-10 min-w-0 bg-transparent">
                <div className="lg:hidden h-14" /> {/* Spacer for mobile header */}
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </main>

            {/* Mobile Panel Overlay */}
            {mobilePanelOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                    onClick={() => toggleMobilePanel(false)}
                />
            )}

            {/* 信息面板容器 - Desktop: 固定显示, Mobile: 右侧抽屉 */}
            <div className={cn(
                "glass-control-panel h-full relative z-50 flex-shrink-0 transition-transform duration-300",
                "lg:translate-x-0 lg:relative",
                "fixed top-0 right-0",
                mobilePanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            )}>
                <div className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/30">
                    <span className="font-bold text-slate-700 text-sm">决策仪表盘</span>
                    <button
                        onClick={() => toggleMobilePanel(false)}
                        className="p-2 rounded-xl hover:bg-white/50 text-slate-500"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <InfoPanel />
            </div>
        </div>
    );
}
