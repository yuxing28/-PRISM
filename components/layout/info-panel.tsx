"use client";

import { AlertCircle, BarChart3, ShieldCheck, Download, Gauge, Radar, Share2 } from "lucide-react";
import { useDecisionStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DimensionRadar } from "@/components/ui/dimension-radar";

const MODE_INFO = {
    fast: { label: '快速模式', desc: '5-10分钟 · 二元决策', color: 'bg-emerald-500' },
    standard: { label: '标准模式', desc: '1-2小时 · 深度分析', color: 'bg-sky-500' },
    complete: { label: '完整模式', desc: '3-5小时+ · 战略级', color: 'bg-violet-500' },
};

function generateReport(session: any) {
    const { title, messages, analysis, createdAt, isDebateMode } = session;
    const date = new Date(createdAt).toLocaleString('zh-CN');
    
    let report = `# 智镜 PRISM 决策分析报告

---

## 基本信息

- **决策主题**: ${title}
- **分析时间**: ${date}
- **分析模式**: ${isDebateMode ? '🔴 红队对抗模式' : '🔵 标准验证模式'}

---

## 决策评估结果

| 指标 | 结果 |
|------|------|
| 综合评分 | **${analysis.score}/10** |
| 风险等级 | **${analysis.risk_level}** |
| 信息完备度 | **${analysis.entropy}%** |

---

## 关键风险因素

`;

    if (analysis.risk_factors.length > 0) {
        analysis.risk_factors.forEach((risk: string, i: number) => {
            report += `${i + 1}. ${risk}\n`;
        });
    } else {
        report += `*暂无识别到的关键风险*\n`;
    }

    report += `
---

## 完整对话记录

`;

    messages.forEach((msg: any) => {
        const role = msg.role === 'user' ? '👤 用户' : '🤖 智镜';
        report += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    });

    report += `
---

*本报告由 智镜 PRISM 多维验证决策系统自动生成*
`;

    return report;
}

function downloadReport(session: any) {
    const report = generateReport(session);
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `智镜决策报告_${session.title.slice(0, 15)}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function shareSession(session: any) {
    // 生成分享文本
    const { title, analysis } = session;
    const shareText = `【智镜 PRISM 决策分析】
📊 ${title}
⭐ 综合评分: ${analysis.score}/10
⚠️ 风险等级: ${analysis.risk_level}
📈 信息完备度: ${analysis.entropy}%

${analysis.risk_factors.length > 0 ? '关键风险:\n' + analysis.risk_factors.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') : ''}

—— 由智镜 PRISM 多维验证决策系统生成`;

    // 尝试使用 Web Share API，否则复制到剪贴板
    if (navigator.share) {
        navigator.share({
            title: `智镜决策分析: ${title}`,
            text: shareText,
        }).catch(() => {
            // 用户取消分享，静默处理
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('分享内容已复制到剪贴板');
        }).catch(() => {
            alert('复制失败，请手动复制');
        });
    }
}

export function InfoPanel() {
    const { sessions, currentSessionId, setDecisionMode } = useDecisionStore();

    const currentSession = sessions.find(s => s.id === currentSessionId);

    // Default fallback state if no session is active
    const analysis = currentSession?.analysis || { 
        score: 0, 
        risk_level: "待评估", 
        entropy: 0, 
        risk_factors: [],
        dimensions: { logic: 0, feasibility: 0, risk: 0, value: 0, timing: 0, resource: 0 }
    };
    const isDebateMode = currentSession?.isDebateMode || false;
    const decisionMode = currentSession?.decisionMode || 'standard';

    // Risk Status logic
    const hasHighRisk = analysis.risk_level.includes("高") || analysis.risk_level.includes("致命");

    return (
        <aside className="w-full h-full lg:flex flex-col relative z-10 bg-transparent overflow-y-auto custom-scrollbar">
            {/* 验证模式选择器 - 移动端可见 */}
            <div className="p-6 space-y-4 dashboard-divider">
                <div className="flex items-center gap-2 px-1">
                    <Gauge className={cn("w-5 h-5", isDebateMode ? "text-rose-500" : "text-sky-500")} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">验证深度</h3>
                </div>

                <div className="flex gap-2">
                    {(['fast', 'standard', 'complete'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setDecisionMode(mode)}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 border",
                                decisionMode === mode
                                    ? `${MODE_INFO[mode].color} text-white border-transparent shadow-md`
                                    : "bg-white/30 text-slate-500 border-white/50 hover:bg-white/50"
                            )}
                        >
                            {MODE_INFO[mode].label.replace('模式', '')}
                        </button>
                    ))}
                </div>

                {isDebateMode && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-200/60">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <div className="flex-1">
                            <span className="text-xs font-bold text-rose-600">红队对抗已激活</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 决策概览 Section */}
            <div className="p-6 space-y-4 dashboard-divider">
                <div className="flex items-center gap-2 px-1">
                    <ShieldCheck className={cn("w-5 h-5", isDebateMode ? "text-rose-500" : "text-sky-500")} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">决策实效概览</h3>
                </div>

                <div className="p-1">
                    <div className="space-y-5">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">综合评分</span>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "font-black text-4xl tracking-tighter",
                                    isDebateMode ? "text-rose-600" : "text-sky-600"
                                )}>
                                    {analysis.score}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/ 10</span>
                            </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all duration-1000",
                                    isDebateMode ? "bg-rose-500" : "bg-sky-500"
                                )}
                                style={{ width: `${analysis.score * 10}%` }}
                            />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">风险评定</span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm transition-colors duration-500",
                                hasHighRisk ? "bg-rose-500 text-white" : "bg-cyan-500 text-white"
                            )}>
                                {analysis.risk_level}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Entropy Dashboard Section */}
            <div className="p-6 space-y-4 dashboard-divider">
                <div className="flex items-center gap-2 px-1">
                    <BarChart3 className={cn("w-5 h-5", isDebateMode ? "text-rose-500" : "text-sky-500")} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">信息完备度</h3>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                            <span>当前信息熵减</span>
                            <span className={cn("font-black text-sm", isDebateMode ? "text-rose-500" : "text-sky-600")}>{analysis.entropy}%</span>
                        </div>
                        <div className="h-3 w-full bg-white/30 rounded-full p-0.5 border border-white/50">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out",
                                    isDebateMode ? "bg-rose-500" : "bg-sky-500"
                                )}
                                style={{ width: `${analysis.entropy}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            {analysis.entropy < 30 ? "信息不足，建议补充更多决策背景" : 
                             analysis.entropy < 60 ? "信息基本充足，可继续深入分析" : 
                             analysis.entropy < 80 ? "信息较为完备，分析结果可信度高" :
                             "信息高度完备，决策依据充分"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 多维度雷达图 Section */}
            <div className="p-6 space-y-4 dashboard-divider">
                <div className="flex items-center gap-2 px-1">
                    <Radar className={cn("w-5 h-5", isDebateMode ? "text-rose-500" : "text-sky-500")} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">多维验证图谱</h3>
                </div>

                <DimensionRadar 
                    dimensions={analysis.dimensions || { logic: 0, feasibility: 0, risk: 0, value: 0, timing: 0, resource: 0 }}
                    isDebateMode={isDebateMode}
                />
            </div>

            {/* v1.8 Standardized AI Feedback Card */}
            <div className="p-6 space-y-4 dashboard-divider">
                <div className="flex items-center gap-2 px-1">
                    <AlertCircle className={cn("w-5 h-5", isDebateMode ? "text-rose-500" : "text-sky-500")} />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">智镜深度洞察</h3>
                </div>

                <div className={cn(
                    "transition-all duration-700",
                    hasHighRisk ? "animate-pulse" : ""
                )}>
                    {analysis.risk_factors.length > 0 ? (
                        <ul className="space-y-3 text-[11px] leading-relaxed font-bold text-slate-600">
                            {analysis.risk_factors.map((risk, i) => (
                                <li key={i} className="flex gap-2.5">
                                    <span className={cn("mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full", hasHighRisk ? "bg-rose-400" : "bg-sky-400")} />
                                    <span>{risk}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 space-y-3 opacity-40">
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-400 animate-spin transition-all duration-1000" />
                            <div className="text-[11px] font-bold italic tracking-widest">全维度逻辑扫描中...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Export & Share Section */}
            <div className="p-6 mt-auto space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => currentSession && downloadReport(currentSession)}
                        disabled={!currentSession || currentSession.messages.length <= 1}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
                            currentSession && currentSession.messages.length > 1
                                ? "bg-white/50 hover:bg-white/70 text-slate-700 border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                                : "bg-white/20 text-slate-300 cursor-not-allowed border border-white/30"
                        )}
                    >
                        <Download className="w-4 h-4" />
                        <span>导出报告</span>
                    </button>
                    <button
                        onClick={() => currentSession && shareSession(currentSession)}
                        disabled={!currentSession || currentSession.messages.length <= 1}
                        className={cn(
                            "flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
                            currentSession && currentSession.messages.length > 1
                                ? "bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 hover:-translate-y-0.5 active:scale-[0.98]"
                                : "bg-slate-200/50 text-slate-300 cursor-not-allowed"
                        )}
                    >
                        <Share2 className="w-4 h-4" />
                        <span>分享</span>
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium">
                    导出 Markdown 报告 · 分享决策摘要
                </p>
            </div>
        </aside>
    );
}
