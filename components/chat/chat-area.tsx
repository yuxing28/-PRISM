"use client";

import { useRef, useEffect } from "react";
import { Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDecisionStore, Message, UserMemory } from "@/lib/store";
import { DecisionTemplates } from "./decision-templates";
import { parseAnalysisData, extractAnalysisFromText, cleanJsonFromText, type AnalysisData } from "@/lib/json-parser";
import { readSSEStream } from "@/lib/sse-stream";
import { extractUserProfileUpdates } from "@/lib/user-profile-learner";

const MODE_CONFIG = {
    fast: { label: '快速', desc: '5-10分钟', color: 'text-emerald-600', bg: 'bg-emerald-500' },
    standard: { label: '标准', desc: '1-2小时', color: 'text-sky-600', bg: 'bg-sky-500' },
    complete: { label: '完整', desc: '3-5小时+', color: 'text-violet-600', bg: 'bg-violet-500' },
};

export function ChatArea() {
    const {
        sessions, currentSessionId, addMessage, isLoading, setLoading,
        setDebateMode, setDecisionMode, currentInput, setInput,
        streamMessageChunk, updateLastMessage, userMemory,
        updateUserMemory, addKeyDecision, hasSeenGuide, setHasSeenGuide,
        apiKey, toggleSettings
    } = useDecisionStore();

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [];
    const isDebateMode = currentSession?.isDebateMode || false;
    const decisionMode = currentSession?.decisionMode || 'standard';

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [currentInput]);

    const handleTemplateSelect = (prompt: string) => setInput(prompt);

    /**
     * 裁剪对话历史，只保留首轮 + 最近 N 轮
     * 大幅减少 token 消耗（10轮对话从 ~8000 tokens 降到 ~3000 tokens）
     */
    const trimMessages = (msgs: Message[], maxRecentRounds: number = 5): Message[] => {
        if (msgs.length <= maxRecentRounds * 2 + 2) return msgs; // 不够裁剪

        const firstRound: Message[] = [];
        // 保留首轮用户消息（决策主题上下文）
        for (const msg of msgs) {
            firstRound.push(msg);
            if (msg.role === 'assistant') break; // 首轮 AI 回复
        }

        // 保留最近 N 轮
        const recentStart = Math.max(msgs.length - maxRecentRounds * 2, firstRound.length);
        const recent = msgs.slice(recentStart);

        // 如果跳过了消息，插入摘要
        const skippedCount = recentStart - firstRound.length;
        if (skippedCount > 0) {
            return [
                ...firstRound,
                { role: 'assistant', content: `[系统提示：以上是首轮对话，以下省略了 ${skippedCount} 条中间消息，继续当前讨论]` },
                ...recent
            ];
        }
        return [...firstRound, ...recent];
    };

    const callChatAPI = async (
        apiMessages: Message[],
        opts: { sessionId: string; isDebateMode: boolean; decisionMode: 'fast' | 'standard' | 'complete'; userMemory: UserMemory }
    ): Promise<string> => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                isDebateMode: opts.isDebateMode,
                decisionMode: opts.decisionMode,
                userMemory: opts.userMemory,
                apiKey: apiKey || undefined,
            }),
        });
        if (!response.ok) {
            let errPayload: { error?: string; details?: string } = {};
            try { errPayload = await response.json(); } catch {}
            const err = new Error(errPayload.details || `HTTP ${response.status}`) as Error & { code?: string; httpStatus?: number };
            err.code = errPayload.error;
            err.httpStatus = response.status;
            throw err;
        }
        if (!response.body) throw new Error('No response body');

        // 流式性能优化：缓冲写入，每帧批量更新一次 store
        let buffer = "";
        let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
        let isFirstWrite = true;

        const flushBuffer = () => {
            if (buffer) {
                if (isFirstWrite) {
                    updateLastMessage(buffer, opts.sessionId);
                    isFirstWrite = false;
                } else {
                    streamMessageChunk(buffer, opts.sessionId);
                }
                buffer = "";
            }
            rafId = null;
        };

        const bufferedWrite = (text: string) => {
            if (!text) return;
            buffer += text;
            if (!rafId) {
                rafId = requestAnimationFrame(flushBuffer);
            }
        };

        try {
            return await readSSEStream(response.body.getReader(), {
                onChunk: (text) => bufferedWrite(text),
            });
        } finally {
            if (rafId) cancelAnimationFrame(rafId);
            flushBuffer();
        }
    };

    const handleSendMessage = async () => {
        if (!currentInput.trim() || isLoading || !currentSessionId) return;

        const sessionIdAtSend = currentSessionId;
        const isDebateModeAtSend = isDebateMode;
        const decisionModeAtSend = decisionMode;
        const userMemoryAtSend = userMemory;

        const userMsg: Message = { role: 'user', content: currentInput };
        addMessage(userMsg, sessionIdAtSend);
        setInput('');
        setLoading(true);
        addMessage({ role: 'assistant', content: '正在思考...' }, sessionIdAtSend);

        const MAX_RETRIES = 2;
        let retryCount = 0;
        let fullResponseText = "";
        let analysisData: AnalysisData | null = null;

        try {
            const apiMessages = trimMessages([...messages, userMsg]);
            fullResponseText = await callChatAPI(apiMessages, { sessionId: sessionIdAtSend, isDebateMode: isDebateModeAtSend, decisionMode: decisionModeAtSend, userMemory: userMemoryAtSend });
            analysisData = parseAnalysisData(fullResponseText);

            const hasJsonCandidate = /JSON_DATA_START|JSON_BLOCK_START|```json|"score"\s*:/.test(fullResponseText);
            if (!analysisData && !hasJsonCandidate) {
                updateLastMessage(fullResponseText.trim(), sessionIdAtSend);
                return;
            }

            while (!analysisData && retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`JSON 解析失败，正在重试 (${retryCount}/${MAX_RETRIES})...`);
                streamMessageChunk(`\n\n🔄 正在重新生成分析数据...`, sessionIdAtSend);
                const retryMessages: Message[] = [
                    ...apiMessages,
                    { role: 'assistant', content: fullResponseText },
                    { role: 'user', content: '请重新输出JSON数据块，格式：JSON_DATA_START 后跟单行JSON对象，最后 JSON_DATA_END。不要用markdown代码块。' }
                ];
                const retryResponse = await callChatAPI(retryMessages, { sessionId: sessionIdAtSend, isDebateMode: isDebateModeAtSend, decisionMode: decisionModeAtSend, userMemory: userMemoryAtSend });
                analysisData = parseAnalysisData(fullResponseText + '\n' + retryResponse) || parseAnalysisData(retryResponse);
            }

            if (analysisData) {
                useDecisionStore.getState().setAnalysisData(analysisData, sessionIdAtSend);

                const profileUpdates = extractUserProfileUpdates(
                    analysisData, currentInput, fullResponseText,
                    userMemory.frequentDomains, userMemory.decisionStyle,
                    userMemory.riskTolerance, userMemory.preferredMode, decisionMode
                );
                if (profileUpdates) updateUserMemory(profileUpdates);

                if (analysisData.entropy >= 60) {
                    const topic = currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : '');
                    const result = analysisData.score >= 7 ? '推荐执行' : analysisData.score >= 5 ? '谨慎考虑' : '不建议';
                    addKeyDecision({ topic, result, score: analysisData.score, riskLevel: analysisData.risk_level, date: Date.now() });
                }

                updateLastMessage(cleanJsonFromText(fullResponseText), sessionIdAtSend);
                if (retryCount > 0) console.log(`JSON 解析成功（重试 ${retryCount} 次）`);
            } else {
                console.warn('JSON 解析最终失败，尝试文本兜底提取');
                const textFallback = extractAnalysisFromText(fullResponseText);
                const fallbackData = textFallback || { score: 5, risk_level: '中等风险' as const, entropy: 40, risk_factors: ['分析数据解析异常，建议重新提问'], dimensions: { logic: 5, feasibility: 5, risk: 5, value: 5, timing: 5, resource: 5 } };
                useDecisionStore.getState().setAnalysisData(fallbackData, sessionIdAtSend);
                updateLastMessage(cleanJsonFromText(fullResponseText) + (textFallback ? '' : '\n\n⚠️ 部分分析数据未能解析，已尽力提取。如需精确分析请重新提问。'), sessionIdAtSend);
            }
        } catch (error) {
            console.error(error);
            const code = (error as { code?: string })?.code;
            let msg = '⚠️ 抱歉，连接中断或服务异常。请检查网络或 API Key 后重试。';
            if (code === 'APIKeyMissing') {
                msg = '🔑 尚未配置 DeepSeek API Key。点击右上角 ⚙️ 设置 → 填入您的 key 后重试。';
                toggleSettings(true);
            } else if (code === 'UpstreamError') {
                msg = '🌐 上游 AI 服务异常，请稍后重试。';
            } else if ((error as { message?: string })?.message) {
                msg = `⚠️ ${(error as { message: string }).message}`;
            }
            updateLastMessage(msg, sessionIdAtSend);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative z-10 px-6 font-sans">
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto pt-8 space-y-10 scrollbar-hide pb-40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-8 lg:pt-16">
                        <div className="flex flex-col items-center mb-8 opacity-60 select-none">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 mix-blend-multiply">
                                <img src="/logo-light.png" alt="智镜 PRISM" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-slate-500 font-bold tracking-[0.2em] text-xs uppercase">智镜 PRISM</p>
                        </div>
                        <DecisionTemplates onSelect={handleTemplateSelect} className="animate-in fade-in slide-in-from-bottom-4 duration-700" />
                    </div>
                )}

                {!hasSeenGuide && messages.length === 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="text-center mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">选择你的决策模式</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                            {([['fast', '快速模式', '5分钟内获得初步决策建议', 'bg-emerald-500'], ['standard', '标准模式', '15分钟深度多维分析', 'bg-sky-500'], ['complete', '完整模式', '1小时+战略级全面分析', 'bg-violet-500']] as const).map(([mode, label, desc, bg]) => (
                                <button key={mode} onClick={() => { setDecisionMode(mode as 'fast' | 'standard' | 'complete'); setHasSeenGuide(true); }} className="group glass-card-premium p-5 text-left hover:scale-[1.02] transition-all duration-300">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </span>
                                        <span className={`font-bold ${MODE_CONFIG[mode].color}`}>{label}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-3">{desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex items-center gap-3 lg:gap-6 group animate-in fade-in slide-in-from-bottom-6 duration-700", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        {msg.role === 'assistant' && (
                            <div className="flex flex-col items-center gap-2 flex-shrink-0 self-start pt-1">
                                <div className={cn("w-9 h-9 lg:w-12 lg:h-12 rounded-full overflow-hidden shadow-xl transition-all duration-700 mix-blend-multiply", isDebateMode && idx === messages.length - 1 ? "ring-2 ring-rose-500 shadow-rose-200/50" : "shadow-sky-100/50")}>
                                    <img src="/logo-light.png" alt="智镜 PRISM" className="w-full h-full object-contain" />
                                </div>
                            </div>
                        )}
                        <div className={cn("rounded-[1.5rem] lg:rounded-[2.5rem] max-w-[85%] lg:max-w-[80%] leading-relaxed transition-all duration-500", msg.role === 'user' ? "px-4 py-2.5 lg:px-6 lg:py-3 bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-tr-none shadow-xl shadow-sky-400/20" : "px-4 py-4 lg:px-8 lg:py-6 bg-white/40 backdrop-blur-3xl text-slate-700 rounded-tl-none border border-white/60 shadow-xl shadow-black/5")}>
                            <div className="text-sm whitespace-pre-wrap font-medium">{msg.content}</div>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-white/60 backdrop-blur-xl border border-white/80 flex items-center justify-center text-slate-500 shadow-lg flex-shrink-0">
                                <User className="w-4 h-4 lg:w-6 lg:h-6" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-6 animate-in fade-in duration-700">
                        <div className="w-12 h-12 rounded-full overflow-hidden animate-pulse shadow-lg mix-blend-multiply">
                            <img src="/logo-light.png" alt="智镜 PRISM" className="w-full h-full object-contain" />
                        </div>
                        <div className="bg-white/20 backdrop-blur-3xl px-7 py-4 rounded-[2.5rem] border border-white/50 text-sm text-slate-500 font-bold italic tracking-wide">正在折叠多维逻辑扇面...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-4 lg:bottom-12 left-0 right-0 flex justify-center px-2 lg:px-4 pointer-events-none">
                <div className={cn("glass-input-capsule w-full max-w-4xl p-2 lg:p-3 transition-all duration-700 pointer-events-auto", isDebateMode ? "prism-glow-rose bg-rose-50/20 border-rose-400/50 shadow-rose-200/50" : "shadow-2xl shadow-sky-500/10")}>
                    <div className="flex items-end gap-2 lg:gap-3 px-2 lg:px-4">
                        <textarea ref={textareaRef} value={currentInput} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={isDebateMode ? "红队对抗模式..." : "输入决策问题..."} className="flex-1 bg-transparent resize-none outline-none text-slate-800 placeholder:text-slate-400/60 min-h-[44px] lg:min-h-[48px] max-h-[120px] lg:max-h-[180px] py-3 text-sm font-bold leading-relaxed scrollbar-hide" rows={1} />
                        <div className="flex items-center gap-2 lg:gap-4 pb-2 lg:pb-2.5 pr-1">
                            <div className="hidden lg:flex items-center gap-1 bg-white/30 rounded-full p-1 border border-white/40">
                                {(['fast', 'standard', 'complete'] as const).map((mode) => (
                                    <button key={mode} onClick={() => setDecisionMode(mode)} title={MODE_CONFIG[mode].desc} className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-300", decisionMode === mode ? `${MODE_CONFIG[mode].bg} text-white shadow-sm` : "text-slate-400 hover:text-slate-600 hover:bg-white/40")}>
                                        {MODE_CONFIG[mode].label}
                                    </button>
                                ))}
                            </div>
                            <div className="hidden lg:block w-px h-6 bg-slate-200/50" />
                            <div onClick={() => setDebateMode(!isDebateMode)} className="flex items-center gap-1.5 lg:gap-2 cursor-pointer group/toggle select-none">
                                <div className={cn("w-9 lg:w-10 h-5 rounded-full relative transition-all duration-500 border-2 overflow-hidden", isDebateMode ? "bg-rose-500 border-rose-400/50 prism-glow-red-sm" : "bg-slate-200/50 border-white/60 shadow-inner")}>
                                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full shadow-lg transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) prism-metal-thumb", isDebateMode ? "left-4 lg:left-5" : "left-0.5")} />
                                </div>
                                <span className={cn("hidden sm:block text-[9px] font-black tracking-[0.15em] transition-all", isDebateMode ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" : "text-slate-500 opacity-70 group-hover/toggle:opacity-100")}>RED</span>
                            </div>
                            <button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()} className={cn("w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-500", isLoading || !currentInput.trim() ? "bg-slate-100 text-slate-300 opacity-50" : isDebateMode ? "bg-rose-500 text-white shadow-xl shadow-rose-300 active:scale-90" : "btn-sapphire active:scale-95")}>
                                <Send className={cn("w-4 h-4 lg:w-5 lg:h-5", !isLoading && currentInput.trim() && "animate-in zoom-in duration-300")} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
