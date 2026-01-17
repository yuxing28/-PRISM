"use client";

import { useRef, useEffect } from "react";
import { Send, Zap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDecisionStore, Message } from "@/lib/store";
import { DecisionTemplates } from "./decision-templates";

// ============ JSON 验证层 ============

interface DimensionScores {
    logic: number;
    feasibility: number;
    risk: number;
    value: number;
    timing: number;
    resource: number;
}

interface AnalysisData {
    score: number;
    risk_level: string;
    entropy: number;
    risk_factors: string[];
    dimensions: DimensionScores;
}

const VALID_RISK_LEVELS = ['低风险', '中等风险', '高风险', '致命风险'];

/**
 * 验证并修复 JSON 数据
 * @returns 验证后的数据，如果无法修复则返回 null
 */
function validateAndFixAnalysisData(data: unknown): AnalysisData | null {
    if (!data || typeof data !== 'object') return null;
    
    const raw = data as Record<string, unknown>;
    
    try {
        // 验证并修复 score (0-10)
        let score = Number(raw.score);
        if (isNaN(score)) score = 5; // 默认中等分数
        score = Math.max(0, Math.min(10, Math.round(score)));
        
        // 验证并修复 risk_level
        let risk_level = String(raw.risk_level || '');
        if (!VALID_RISK_LEVELS.includes(risk_level)) {
            // 尝试模糊匹配
            if (risk_level.includes('低') || risk_level.toLowerCase().includes('low')) {
                risk_level = '低风险';
            } else if (risk_level.includes('致命') || risk_level.toLowerCase().includes('fatal')) {
                risk_level = '致命风险';
            } else if (risk_level.includes('高') || risk_level.toLowerCase().includes('high')) {
                risk_level = '高风险';
            } else {
                risk_level = '中等风险'; // 默认
            }
        }
        
        // 验证并修复 entropy (0-100)
        let entropy = Number(raw.entropy);
        if (isNaN(entropy)) entropy = 50;
        entropy = Math.max(0, Math.min(100, Math.round(entropy)));
        
        // 验证并修复 risk_factors
        let risk_factors: string[] = [];
        if (Array.isArray(raw.risk_factors)) {
            risk_factors = raw.risk_factors
                .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                .slice(0, 10); // 最多10个
        }
        if (risk_factors.length === 0) {
            risk_factors = ['需要进一步分析'];
        }
        
        // 验证并修复 dimensions
        const rawDimensions = (raw.dimensions || {}) as Record<string, unknown>;
        const dimensions: DimensionScores = {
            logic: validateDimensionScore(rawDimensions.logic),
            feasibility: validateDimensionScore(rawDimensions.feasibility),
            risk: validateDimensionScore(rawDimensions.risk),
            value: validateDimensionScore(rawDimensions.value),
            timing: validateDimensionScore(rawDimensions.timing),
            resource: validateDimensionScore(rawDimensions.resource),
        };
        
        return { score, risk_level, entropy, risk_factors, dimensions };
    } catch (e) {
        console.error('Analysis data validation failed:', e);
        return null;
    }
}

function validateDimensionScore(value: unknown): number {
    const num = Number(value);
    if (isNaN(num)) return 5; // 默认中等
    return Math.max(0, Math.min(10, Math.round(num)));
}

/**
 * 从文本中提取 JSON 块
 */
function extractJsonBlock(text: string): string | null {
    // 方法1: 标准分隔符（支持带或不带 ** 的格式）
    // 匹配: ___JSON_BLOCK_START___ 或 ___**JSON_BLOCK_START**___
    const blockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___([\s\S]*?)___\*{0,2}JSON_BLOCK_END\*{0,2}___/;
    const blockMatch = text.match(blockRegex);
    if (blockMatch) return blockMatch[1].trim();
    
    // 方法2: 尝试找 ```json 代码块
    const codeBlockRegex = /```json\s*([\s\S]*?)```/;
    const codeMatch = text.match(codeBlockRegex);
    if (codeMatch) return codeMatch[1].trim();
    
    // 方法3: 尝试找最后一个完整的 JSON 对象
    const jsonObjectRegex = /\{[\s\S]*"score"[\s\S]*"dimensions"[\s\S]*\}/g;
    const matches = text.match(jsonObjectRegex);
    if (matches && matches.length > 0) {
        return matches[matches.length - 1];
    }
    
    return null;
}

/**
 * 解析并验证分析数据
 */
function parseAnalysisData(text: string): AnalysisData | null {
    const jsonStr = extractJsonBlock(text);
    if (!jsonStr) return null;
    
    try {
        const parsed = JSON.parse(jsonStr);
        return validateAndFixAnalysisData(parsed);
    } catch (e) {
        console.error('JSON parse error:', e);
        
        // 尝试修复常见的 JSON 格式问题
        try {
            // 移除可能的尾部逗号
            const fixed = jsonStr
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                // 修复未转义的换行
                .replace(/[\r\n]+/g, ' ');
            const parsed = JSON.parse(fixed);
            return validateAndFixAnalysisData(parsed);
        } catch {
            return null;
        }
    }
}

// ============ 组件配置 ============

const MODE_CONFIG = {
    fast: { label: '快速', desc: '5-10分钟', color: 'text-emerald-600', bg: 'bg-emerald-500' },
    standard: { label: '标准', desc: '1-2小时', color: 'text-sky-600', bg: 'bg-sky-500' },
    complete: { label: '完整', desc: '3-5小时+', color: 'text-violet-600', bg: 'bg-violet-500' },
};

// 决策领域关键词映射
const DOMAIN_KEYWORDS: Record<string, string[]> = {
    '投资理财': ['投资', '理财', '股票', '基金', '房产', '买房', '炒股', '收益', '回报'],
    '职业发展': ['跳槽', '辞职', '工作', '职业', '升职', '加薪', '转行', '创业', '副业'],
    '教育学习': ['留学', '考研', '学习', '培训', '考证', '进修', '读书'],
    '生活决策': ['买车', '装修', '搬家', '结婚', '离婚', '生育'],
    '健康医疗': ['手术', '治疗', '体检', '医院', '健康'],
    '人际关系': ['朋友', '家人', '合作', '分手', '社交'],
};

/**
 * 从用户输入中提取决策领域
 */
function extractDomain(userInput: string): string | null {
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some(kw => userInput.includes(kw))) {
            return domain;
        }
    }
    return null;
}

/**
 * 根据分析结果推断用户决策风格
 */
function inferDecisionStyle(
    analysisData: AnalysisData, 
    responseText: string
): 'conservative' | 'neutral' | 'aggressive' | null {
    // 从响应文本中寻找风格线索
    const conservativeKeywords = ['保守', '稳健', '谨慎', '风险厌恶', '安全第一'];
    const aggressiveKeywords = ['激进', '冒险', '高风险高回报', '敢于尝试', '大胆'];
    
    const hasConservative = conservativeKeywords.some(kw => responseText.includes(kw));
    const hasAggressive = aggressiveKeywords.some(kw => responseText.includes(kw));
    
    // 结合风险评分判断
    if (analysisData.risk_level === '低风险' && hasConservative) {
        return 'conservative';
    }
    if (analysisData.risk_level === '高风险' && hasAggressive) {
        return 'aggressive';
    }
    
    return null; // 信息不足，不更新
}

export function ChatArea() {
    const {
        sessions,
        currentSessionId,
        addMessage,
        isLoading,
        setLoading,
        setDebateMode,
        setDecisionMode,
        currentInput,
        setInput,
        streamMessageChunk,
        updateLastMessage,
        apiKey,
        userMemory,
        updateUserMemory,
        addKeyDecision
    } = useDecisionStore();

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [];
    const isDebateMode = currentSession?.isDebateMode || false;
    const decisionMode = currentSession?.decisionMode || 'standard';

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTemplateSelect = (prompt: string) => {
        setInput(prompt);
    };

    /**
     * 从分析结果中提取并更新用户画像
     */
    const extractAndUpdateUserProfile = (
        analysisData: AnalysisData, 
        userInput: string, 
        responseText: string
    ) => {
        // 只在信息充足时（entropy > 50）才学习用户画像
        if (analysisData.entropy < 50) return;

        // 1. 提取决策领域
        const domain = extractDomain(userInput);
        if (domain) {
            const currentDomains = userMemory.frequentDomains;
            if (!currentDomains.includes(domain)) {
                updateUserMemory({
                    frequentDomains: [...currentDomains, domain].slice(-5) // 最多保留5个
                });
            }
        }

        // 2. 推断决策风格（需要多次一致才更新）
        const inferredStyle = inferDecisionStyle(analysisData, responseText);
        if (inferredStyle && userMemory.decisionStyle === 'unknown') {
            updateUserMemory({ decisionStyle: inferredStyle });
        }

        // 3. 更新风险承受度（基于用户选择的决策风险等级的移动平均）
        const riskScore = analysisData.risk_level === '低风险' ? 3 
            : analysisData.risk_level === '中等风险' ? 5 
            : analysisData.risk_level === '高风险' ? 7 
            : 9;
        const newTolerance = Math.round((userMemory.riskTolerance * 0.7) + (riskScore * 0.3));
        updateUserMemory({ riskTolerance: newTolerance });

        // 4. 记录关键决策（只记录信息充足的决策）
        if (analysisData.entropy >= 60) {
            const topic = userInput.slice(0, 30) + (userInput.length > 30 ? '...' : '');
            const result = analysisData.score >= 7 ? '推荐执行' 
                : analysisData.score >= 5 ? '谨慎考虑' 
                : '不建议';
            
            addKeyDecision({
                topic,
                result,
                score: analysisData.score,
                riskLevel: analysisData.risk_level,
                date: Date.now()
            });
        }

        // 5. 记录偏好的分析模式
        if (userMemory.preferredMode === 'unknown') {
            updateUserMemory({ preferredMode: decisionMode });
        }
    };

    // 单次 API 调用
    const callChatAPI = async (apiMessages: Message[]): Promise<string> => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                isDebateMode: isDebateMode,
                decisionMode: decisionMode,
                apiKey: apiKey,
                userMemory: userMemory // 传递用户画像
            }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        streamMessageChunk(content);
                        fullResponseText += content;
                    }
                } catch (e) {
                    console.error('SSE Error', e);
                }
            }
        }

        return fullResponseText;
    };

    const handleSendMessage = async () => {
        if (!currentInput.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: currentInput };
        addMessage(userMsg);
        setInput('');
        setLoading(true);

        // Initial AI placeholder
        addMessage({ role: 'assistant', content: '' });

        const MAX_RETRIES = 2;
        let retryCount = 0;
        let fullResponseText = "";
        let analysisData: AnalysisData | null = null;

        try {
            const apiMessages = [...messages, userMsg];
            
            // 首次调用
            fullResponseText = await callChatAPI(apiMessages);
            
            // 尝试解析 JSON
            analysisData = parseAnalysisData(fullResponseText);
            
            // 如果解析失败，进行重试
            while (!analysisData && retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`JSON 解析失败，正在重试 (${retryCount}/${MAX_RETRIES})...`);
                
                // 添加重试提示到消息流
                streamMessageChunk(`\n\n🔄 正在重新生成分析数据...`);
                
                // 构建重试消息，要求重新输出 JSON
                const retryMessages: Message[] = [
                    ...apiMessages,
                    { role: 'assistant', content: fullResponseText },
                    { 
                        role: 'user', 
                        content: '请重新输出JSON数据块，确保格式正确。只需要输出 ___JSON_BLOCK_START___ 和 ___JSON_BLOCK_END___ 之间的JSON内容即可。' 
                    }
                ];
                
                // 重新调用 API
                const retryResponse = await callChatAPI(retryMessages);
                
                // 合并响应用于解析
                const combinedText = fullResponseText + '\n' + retryResponse;
                analysisData = parseAnalysisData(combinedText);
                
                // 如果还是失败，尝试只解析重试响应
                if (!analysisData) {
                    analysisData = parseAnalysisData(retryResponse);
                }
            }

            // 处理解析结果
            if (analysisData) {
                // 更新 Store
                useDecisionStore.getState().setAnalysisData(analysisData);
                
                // 从分析结果中学习用户画像
                extractAndUpdateUserProfile(analysisData, currentInput, fullResponseText);
                
                // 清理消息中的 JSON 块（支持带或不带 ** 的格式）
                const jsonBlockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g;
                const cleanedContent = fullResponseText
                    .replace(jsonBlockRegex, '')
                    .replace(/```json[\s\S]*?```/g, '')
                    .replace(/🔄 正在重新生成分析数据\.\.\./g, '')
                    .trim();
                updateLastMessage(cleanedContent);
                
                if (retryCount > 0) {
                    console.log(`JSON 解析成功（重试 ${retryCount} 次）`);
                }
            } else {
                // 所有重试都失败，使用默认值
                console.warn('JSON 解析最终失败，使用默认分析数据');
                const defaultData: AnalysisData = {
                    score: 5,
                    risk_level: '中等风险',
                    entropy: 50,
                    risk_factors: ['分析数据解析异常，建议重新提问'],
                    dimensions: {
                        logic: 5,
                        feasibility: 5,
                        risk: 5,
                        value: 5,
                        timing: 5,
                        resource: 5
                    }
                };
                useDecisionStore.getState().setAnalysisData(defaultData);
                
                // 添加提示
                streamMessageChunk('\n\n⚠️ 分析数据格式异常，已使用默认评估。建议重新描述您的决策问题。');
            }

        } catch (error) {
            console.error(error);
            streamMessageChunk('\n\n⚠️ 抱歉，连接中断或服务异常。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative z-10 px-6 font-sans">
            {/* Messages Area */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto pt-8 space-y-10 scrollbar-hide pb-40">
                {/* 空状态：Logo + 模板一起显示 */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-8 lg:pt-16">
                        {/* 小型 Logo */}
                        <div className="flex flex-col items-center mb-8 opacity-60 select-none">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 mix-blend-multiply">
                                <img 
                                    src="/logo-light.png" 
                                    alt="智镜 PRISM" 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <p className="text-slate-500 font-bold tracking-[0.2em] text-xs uppercase">智镜 PRISM</p>
                        </div>
                        
                        {/* 决策模板 */}
                        <DecisionTemplates 
                            onSelect={handleTemplateSelect}
                            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                        />
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex items-center gap-3 lg:gap-6 group animate-in fade-in slide-in-from-bottom-6 duration-700", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        {msg.role === 'assistant' && (
                            <div className="flex flex-col items-center gap-2 flex-shrink-0 self-start pt-1">
                                <div className={cn(
                                    "w-9 h-9 lg:w-12 lg:h-12 rounded-full overflow-hidden shadow-xl transition-all duration-700 mix-blend-multiply",
                                    isDebateMode && idx === messages.length - 1 ? "ring-2 ring-rose-500 shadow-rose-200/50" : "shadow-sky-100/50"
                                )}>
                                    <img 
                                        src="/logo-light.png" 
                                        alt="智镜 PRISM" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className={cn(
                            "rounded-[1.5rem] lg:rounded-[2.5rem] max-w-[85%] lg:max-w-[80%] leading-relaxed transition-all duration-500",
                            msg.role === 'user'
                                ? "px-4 py-2.5 lg:px-6 lg:py-3 bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-tr-none shadow-xl shadow-sky-400/20"
                                : "px-4 py-4 lg:px-8 lg:py-6 bg-white/40 backdrop-blur-3xl text-slate-700 rounded-tl-none border border-white/60 shadow-xl shadow-black/5"
                        )}>
                            <div className="text-sm whitespace-pre-wrap font-medium">
                                {msg.content}
                            </div>
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
                        <div className="bg-white/20 backdrop-blur-3xl px-7 py-4 rounded-[2.5rem] border border-white/50 text-sm text-slate-500 font-bold italic tracking-wide">
                            正在折叠多维逻辑扇面...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Console */}
            <div className="absolute bottom-4 lg:bottom-12 left-0 right-0 flex justify-center px-2 lg:px-4 pointer-events-none">
                <div className={cn(
                    "glass-input-capsule w-full max-w-4xl p-2 lg:p-3 transition-all duration-700 pointer-events-auto",
                    isDebateMode ? "prism-glow-rose bg-rose-50/20 border-rose-400/50 shadow-rose-200/50" : "shadow-2xl shadow-sky-500/10"
                )}>
                    <div className="flex items-end gap-2 lg:gap-3 px-2 lg:px-4">
                        <textarea
                            value={currentInput}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={isDebateMode ? "红队对抗模式..." : "输入决策问题..."}
                            className="flex-1 bg-transparent resize-none outline-none text-slate-800 placeholder:text-slate-400/60 min-h-[44px] lg:min-h-[48px] max-h-[120px] lg:max-h-[180px] py-3 text-sm font-bold leading-relaxed scrollbar-hide"
                            rows={1}
                        />

                        <div className="flex items-center gap-2 lg:gap-4 pb-2 lg:pb-2.5 pr-1">
                            {/* Decision Mode Selector - 仅桌面端显示 */}
                            <div className="hidden lg:flex items-center gap-1 bg-white/30 rounded-full p-1 border border-white/40">
                                {(['fast', 'standard', 'complete'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setDecisionMode(mode)}
                                        title={MODE_CONFIG[mode].desc}
                                        className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-300",
                                            decisionMode === mode
                                                ? `${MODE_CONFIG[mode].bg} text-white shadow-sm`
                                                : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        {MODE_CONFIG[mode].label}
                                    </button>
                                ))}
                            </div>

                            {/* Divider - 仅桌面端 */}
                            <div className="hidden lg:block w-px h-6 bg-slate-200/50" />

                            {/* Red Team Toggle */}
                            <div
                                onClick={() => setDebateMode(!isDebateMode)}
                                className="flex items-center gap-1.5 lg:gap-2 cursor-pointer group/toggle select-none"
                            >
                                <div className={cn(
                                    "w-9 lg:w-10 h-5 rounded-full relative transition-all duration-500 border-2 overflow-hidden",
                                    isDebateMode
                                        ? "bg-rose-500 border-rose-400/50 prism-glow-red-sm"
                                        : "bg-slate-200/50 border-white/60 shadow-inner"
                                )}>
                                    <div className={cn(
                                        "absolute top-0.5 w-4 h-4 rounded-full shadow-lg transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) prism-metal-thumb",
                                        isDebateMode ? "left-4 lg:left-5" : "left-0.5"
                                    )} />
                                </div>
                                <span className={cn(
                                    "hidden sm:block text-[9px] font-black tracking-[0.15em] transition-all",
                                    isDebateMode ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" : "text-slate-500 opacity-70 group-hover/toggle:opacity-100"
                                )}>
                                    RED
                                </span>
                            </div>

                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !currentInput.trim()}
                                className={cn(
                                    "w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-500",
                                    isLoading || !currentInput.trim()
                                        ? "bg-slate-100 text-slate-300 opacity-50"
                                        : isDebateMode
                                            ? "bg-rose-500 text-white shadow-xl shadow-rose-300 active:scale-90"
                                            : "btn-sapphire active:scale-95"
                                )}
                            >
                                <Send className={cn("w-4 h-4 lg:w-5 lg:h-5", !isLoading && currentInput.trim() && "animate-in zoom-in duration-300")} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
