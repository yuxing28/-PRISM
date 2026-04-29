"use client";

import { useState } from "react";
import { AlertCircle, BarChart3, ShieldCheck, Download, Gauge, Radar, Share2, Play, Ban, TrendingUp, Clock, CheckCircle, X } from "lucide-react";
import { useDecisionStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DimensionRadar } from "@/components/ui/dimension-radar";

const MODE_INFO = {
    fast: { label: '快速模式', desc: '5-10分钟 · 二元决策', color: 'bg-emerald-500' },
    standard: { label: '标准模式', desc: '1-2小时 · 深度分析', color: 'bg-sky-500' },
    complete: { label: '完整模式', desc: '3-5小时+ · 战略级', color: 'bg-violet-500' },
};

type SessionForReport = {
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    analysis: {
        score: number;
        risk_level: string;
        entropy: number;
        risk_factors: string[];
    };
    createdAt: number;
    isDebateMode: boolean;
};

function generateReport(session: SessionForReport) {
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

    messages.forEach((msg) => {
        const role = msg.role === 'user' ? '👤 用户' : '🤖 智镜';
        report += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    });

    report += `
---

*本报告由 智镜 PRISM 多维验证决策系统自动生成*
`;

    return report;
}

function downloadReport(session: SessionForReport) {
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

function shareSession(session: SessionForReport) {
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
    const { sessions, currentSessionId, setDecisionMode, setReviewReminder, setReviewResult } = useDecisionStore();

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        actualResult: '',
        wasCorrect: false,
        lessons: ''
    });
    const [reminderWeeks, setReminderWeeks] = useState(4);

    const currentSession = sessions.find(s => s.id === currentSessionId);

    // Default fallback state if no session is active
    const analysis = currentSession?.analysis || { 
        score: 0, 
        risk_level: "待评估", 
        entropy: 0, 
        risk_factors: [],
        dimensions: { logic: 0, feasibility: 0, risk: 0, value: 0, timing: 0, resource: 0 },
        decision_type: "",
        min_viable_action: { summary: "", reason: "", how_to_verify: "" },
        stop_loss: { condition: "", action: "", reason: "" },
        escalation: { condition: "", action: "", reason: "" },
        score_interpretation: "",
        risk_priorities: [],
        mode_recommendation: undefined,
        info_progress: undefined
    };
    const isDebateMode = currentSession?.isDebateMode || false;
    const decisionMode = currentSession?.decisionMode || 'standard';

    const isUnassessed = !currentSession || (
        analysis.score === 0 &&
        analysis.entropy === 0 &&
        analysis.risk_level === "待评估" &&
        analysis.risk_factors.length === 0 &&
        Object.values(analysis.dimensions || {}).every(v => v === 0)
    );

    const evaluationTag = isUnassessed
        ? { text: "未评估", className: "bg-slate-200/70 text-slate-500 border-slate-300/60" }
        : analysis.entropy < 50
            ? { text: "初评", className: "bg-amber-100 text-amber-700 border-amber-200" }
            : { text: "复评", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };

    // Risk Status logic
    const hasHighRisk = !isUnassessed && (analysis.risk_level.includes("高") || analysis.risk_level.includes("致命"));

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
                    <span className={cn(
                        "ml-auto px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        evaluationTag.className
                    )}>
                        {evaluationTag.text}
                    </span>
                </div>

                {/* 决策类型标签 */}
                {analysis.decision_type && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">决策类型：</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                            {analysis.decision_type}
                        </span>
                    </div>
                )}

                <div className="p-1">
                    <div className="space-y-5">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">综合评分</span>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "font-black text-4xl tracking-tighter",
                                    isDebateMode ? "text-rose-600" : "text-sky-600"
                                )}>
                                    {isUnassessed ? "--" : analysis.score}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/ 10</span>
                            </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all duration-1000",
                                    isUnassessed
                                        ? "bg-slate-300"
                                        : isDebateMode
                                            ? "bg-rose-500"
                                            : "bg-sky-500"
                                )}
                                style={{ width: `${isUnassessed ? 0 : analysis.score * 10}%` }}
                            />
                        </div>

                        {/* 评分解读 */}
                        {!isUnassessed && analysis.score_interpretation && (
                            <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-200/30">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {analysis.score_interpretation}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">风险评定</span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm transition-colors duration-500",
                                isUnassessed
                                    ? "bg-slate-300 text-slate-600"
                                    : hasHighRisk
                                        ? "bg-rose-500 text-white"
                                        : "bg-cyan-500 text-white"
                            )}>
                                {isUnassessed ? "未评估" : analysis.risk_level}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 模式推荐卡片 */}
            {analysis.mode_recommendation && (
                <div className="p-6 space-y-4 dashboard-divider">
                    <div className="flex items-center gap-2 px-1">
                        <Gauge className="w-5 h-5 text-violet-500" />
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">模式推荐</h3>
                    </div>

                    <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-200/60">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-violet-700">
                                建议使用「{analysis.mode_recommendation.recommended === 'fast' ? '快速' : analysis.mode_recommendation.recommended === 'standard' ? '标准' : '完整'}模式」
                            </span>
                            {analysis.mode_recommendation.estimated_time && (
                                <span className="text-xs text-violet-500">
                                    {analysis.mode_recommendation.estimated_time}
                                </span>
                            )}
                        </div>
                        {analysis.mode_recommendation.reason && (
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {analysis.mode_recommendation.reason}
                            </p>
                        )}
                        {analysis.mode_recommendation.alternative && (
                            <p className="text-xs text-slate-500 mt-2">
                                {analysis.mode_recommendation.alternative}
                            </p>
                        )}
                    </div>
                </div>
            )}

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
                            {isUnassessed
                                ? "发送你的决策问题后开始评估，并随补充信息实时更新"
                                : analysis.entropy < 30
                                    ? "信息不足，当前为初评，建议补充更多决策背景"
                                    : analysis.entropy < 60
                                        ? "信息基本够用，评分会随你补充信息继续更新"
                                        : analysis.entropy < 80
                                            ? "信息较为完备，分析结果可信度较高"
                                            : "信息高度完备，决策依据充分"}
                        </p>
                    </div>

                    {/* 信息收集进度详情 */}
                    {analysis.info_progress && analysis.info_progress.needed.length > 0 && (
                        <div className="mt-4 p-3 rounded-2xl glass-card-premium">
                            <div className="text-[10px] font-bold text-amber-600 mb-2">
                                待补充信息 ({analysis.info_progress.current}/{analysis.info_progress.min_required})
                            </div>
                            <div className="space-y-1">
                                {analysis.info_progress.needed.slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

            {/* 行动方案卡片 */}
            {!isUnassessed && analysis.min_viable_action?.summary && (
                <div className="p-6 space-y-4 dashboard-divider">
                    <div className="flex items-center gap-2 px-1">
                        <Play className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase tracking-widest">行动方案</h3>
                    </div>

                    <div className="space-y-4">
                        {/* 最小行动 */}
                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
                            <div className="flex items-center gap-2 mb-2">
                                <Play className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-700">最小行动</span>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{analysis.min_viable_action.summary}</p>
                            {analysis.min_viable_action.reason && (
                                <p className="text-xs text-slate-500 mt-1">目的：{analysis.min_viable_action.reason}</p>
                            )}
                            {analysis.min_viable_action.how_to_verify && (
                                <p className="text-xs text-slate-500">验证：{analysis.min_viable_action.how_to_verify}</p>
                            )}
                        </div>

                        {/* 止损条件 */}
                        {analysis.stop_loss?.condition && (
                            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ban className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-rose-700">止损条件</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700">
                                    如果 {analysis.stop_loss.condition} → {analysis.stop_loss.action}
                                </p>
                                {analysis.stop_loss.reason && (
                                    <p className="text-xs text-slate-500 mt-1">原因：{analysis.stop_loss.reason}</p>
                                )}
                            </div>
                        )}

                        {/* 追加条件 */}
                        {analysis.escalation?.condition && (
                            <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-sky-500" />
                                    <span className="text-xs font-bold text-sky-700">追加条件</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700">
                                    如果 {analysis.escalation.condition} → {analysis.escalation.action}
                                </p>
                                {analysis.escalation.reason && (
                                    <p className="text-xs text-slate-500 mt-1">原因：{analysis.escalation.reason}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            {analysis.risk_factors.map((risk, i) => {
                                // 获取优先级
                                const priority = analysis.risk_priorities?.[i]?.priority || 
                                    (hasHighRisk ? 'high' : 'medium');
                                const priorityColors = {
                                    high: 'bg-rose-500 text-white',
                                    medium: 'bg-amber-500 text-white',
                                    low: 'bg-emerald-500 text-white'
                                };
                                const priorityLabels = {
                                    high: '高',
                                    medium: '中',
                                    low: '低'
                                };
                                return (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className={cn(
                                            "mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full",
                                            priority === 'high' ? 'bg-rose-400' : priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                                        )} />
                                        <div className="flex-1">
                                            <span>{risk}</span>
                                            {analysis.risk_priorities?.[i] && (
                                                <span className={cn(
                                                    "ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                                                    priorityColors[priority]
                                                )}>
                                                    {priorityLabels[priority]}优先
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
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

                {/* 复盘入口 */}
                {currentSession && currentSession.analysis.score > 0 && (
                    <div className="pt-4 border-t border-slate-200/30">
                        {!currentSession.reviewResult ? (
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl glass-card-premium text-sky-600 border border-sky-200/50 font-bold text-sm hover:shadow-lg hover:shadow-sky-500/20 transition-all"
                            >
                                <Clock className="w-4 h-4" />
                                <span>设置复盘提醒</span>
                            </button>
                        ) : (
                            <div className="p-4 rounded-2xl glass-card-premium">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1">
                                    <CheckCircle className="w-4 h-4" />
                                    已完成复盘
                                </div>
                                <p className="text-[10px] text-slate-600 line-clamp-2">
                                    {currentSession.reviewResult.lessons}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 复盘 Modal */}
            {showReviewModal && currentSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="glass-card-premium w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800">设置复盘提醒</h3>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-white/50 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {!currentSession.reviewResult ? (
                            <>
                                <p className="text-sm text-slate-600 mb-4">
                                    决策需要时间验证结果。请设置提醒时间，到期后回顾这个决策的实际结果。
                                </p>

                                <div className="space-y-3 mb-6">
                                    <p className="text-xs font-bold text-slate-500">多久后复盘？</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 6].map(weeks => (
                                            <button
                                                key={weeks}
                                                onClick={() => setReminderWeeks(weeks)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                                                    reminderWeeks === weeks
                                                        ? "bg-violet-500 text-white"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}
                                            >
                                                {weeks}个月
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const reminderTime = Date.now() + reminderWeeks * 30 * 24 * 60 * 60 * 1000;
                                        setReviewReminder(currentSession.id, reminderTime);
                                        setShowReviewModal(false);
                                    }}
                                    className="w-full py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600 transition-all"
                                >
                                    设置提醒
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">实际发生了什么？</label>
                                        <textarea
                                            value={reviewForm.actualResult}
                                            onChange={(e) => setReviewForm({...reviewForm, actualResult: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-none"
                                            rows={2}
                                            placeholder="描述决策的实际结果..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">经验教训</label>
                                        <textarea
                                            value={reviewForm.lessons}
                                            onChange={(e) => setReviewForm({...reviewForm, lessons: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-none"
                                            rows={2}
                                            placeholder="这次决策给你什么启发？"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setReviewResult(currentSession.id, {
                                            actualResult: reviewForm.actualResult,
                                            wasCorrect: reviewForm.wasCorrect,
                                            lessons: reviewForm.lessons
                                        });
                                        setShowReviewModal(false);
                                    }}
                                    className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all"
                                >
                                    保存复盘
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
