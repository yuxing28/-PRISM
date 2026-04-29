"use client";

import { useRef, useEffect } from "react";
import { Send, Zap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDecisionStore, Message, UserMemory } from "@/lib/store";
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
    decision_type?: string;
    min_viable_action?: {
        summary: string;
        reason: string;
        how_to_verify: string;
    };
    stop_loss?: {
        condition: string;
        action: string;
        reason: string;
    };
    escalation?: {
        condition: string;
        action: string;
        reason: string;
    };
    score_interpretation?: string;
    risk_priorities?: Array<{
        factor: string;
        priority: 'high' | 'medium' | 'low';
    }>;
    mode_recommendation?: {
        recommended: 'fast' | 'standard' | 'complete';
        reason: string;
        estimated_time: string;
        alternative?: string;
    };
    info_progress?: {
        collected: string[];
        needed: string[];
        min_required: number;
        current: number;
    };
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

        // 验证并修复 score (0-10)
        const rawScore = raw.score;
        let score = (rawScore === null || rawScore === undefined) ? NaN : Number(rawScore);
        const dimensionScores = Object.values(dimensions);
        const avgScore = dimensionScores.reduce((sum, val) => sum + val, 0) / dimensionScores.length;
        if (isNaN(score)) {
            score = avgScore;
        }
        if (isNaN(score)) score = 5;
        score = Math.max(0, Math.min(10, Math.round(score)));
        if (score === 0) {
            score = Math.max(1, Math.min(10, Math.round(avgScore)));
        }
        
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

        // 解析新字段
        const decision_type = raw.decision_type ? String(raw.decision_type) : undefined;
        
        const rawMva = raw.min_viable_action as Record<string, unknown> | undefined;
        const min_viable_action = rawMva ? {
            summary: String(rawMva.summary || ''),
            reason: String(rawMva.reason || ''),
            how_to_verify: String(rawMva.how_to_verify || '')
        } : undefined;

        const rawSl = raw.stop_loss as Record<string, unknown> | undefined;
        const stop_loss = rawSl ? {
            condition: String(rawSl.condition || ''),
            action: String(rawSl.action || ''),
            reason: String(rawSl.reason || '')
        } : undefined;

        const rawEsc = raw.escalation as Record<string, unknown> | undefined;
        const escalation = rawEsc ? {
            condition: String(rawEsc.condition || ''),
            action: String(rawEsc.action || ''),
            reason: String(rawEsc.reason || '')
        } : undefined;

        const score_interpretation = raw.score_interpretation ? String(raw.score_interpretation) : undefined;

        const rawRp = raw.risk_priorities as Array<{factor?: unknown; priority?: unknown}> | undefined;
        const risk_priorities = rawRp ? 
            rawRp
                .filter(p => p && typeof p.factor === 'string')
                .map(p => ({
                    factor: String(p.factor),
                    priority: (p.priority === 'high' || p.priority === 'medium' || p.priority === 'low') 
                        ? p.priority as 'high' | 'medium' | 'low' : 'medium' as const
                })) : undefined;

        const rawMr = raw.mode_recommendation as Record<string, unknown> | undefined;
        const mode_recommendation = rawMr ? {
            recommended: (rawMr.recommended === 'fast' || rawMr.recommended === 'standard' || rawMr.recommended === 'complete') 
                ? rawMr.recommended as 'fast' | 'standard' | 'complete' : 'standard' as const,
            reason: String(rawMr.reason || ''),
            estimated_time: String(rawMr.estimated_time || ''),
            alternative: rawMr.alternative ? String(rawMr.alternative) : undefined
        } : undefined;

        const rawIp = raw.info_progress as Record<string, unknown> | undefined;
        const info_progress = rawIp ? {
            collected: Array.isArray(rawIp.collected) ? rawIp.collected.map((c: unknown) => String(c)) : [],
            needed: Array.isArray(rawIp.needed) ? rawIp.needed.map((n: unknown) => String(n)) : [],
            min_required: typeof rawIp.min_required === 'number' ? rawIp.min_required : 3,
            current: typeof rawIp.current === 'number' ? rawIp.current : 0
        } : undefined;
        
        return { 
            score, 
            risk_level, 
            entropy, 
            risk_factors, 
            dimensions,
            decision_type,
            min_viable_action,
            stop_loss,
            escalation,
            score_interpretation,
            risk_priorities,
            mode_recommendation,
            info_progress
        };
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
 * 从文本中提取 JSON 块（支持多种格式）
 */
function extractJsonBlock(text: string): string | null {
    // 方法1: 新格式 JSON_DATA_START ... JSON_DATA_END
    const dataMarkerRegex = /JSON_DATA_START\s*([\s\S]*?)\s*JSON_DATA_END/g;
    const dataMatches = Array.from(text.matchAll(dataMarkerRegex));
    if (dataMatches.length > 0) {
        const last = dataMatches[dataMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }

    // 方法2: 旧格式 ___JSON_BLOCK_START___ ... ___JSON_BLOCK_END___（兼容）
    const blockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___([\s\S]*?)___\*{0,2}JSON_BLOCK_END\*{0,2}___/g;
    const blockMatches = Array.from(text.matchAll(blockRegex));
    if (blockMatches.length > 0) {
        const last = blockMatches[blockMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }
    
    // 方法3: markdown 代码块格式
    const codeBlockRegex = /```json\s*([\s\S]*?)```/g;
    const codeMatches = Array.from(text.matchAll(codeBlockRegex));
    if (codeMatches.length > 0) {
        const last = codeMatches[codeMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }
    
    // 方法4: 找最后一个包含 score 和 dimensions 的 JSON 对象
    const jsonObjectRegex = /\{\s*"score"[\s\S]*?"dimensions"[\s\S]*?\}/g;
    const matches = text.match(jsonObjectRegex);
    if (matches && matches.length > 0) {
        return matches[matches.length - 1];
    }
    
    return null;
}

/**
 * 从纯文本中兜底提取关键分析数据（JSON 完全失败时使用）
 */
function extractAnalysisFromText(text: string): AnalysisData | null {
    // 尝试从文本中提取分数
    const scoreMatch = text.match(/综合评分[：:]\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

    // 尝试提取风险等级
    let risk_level = '中等风险';
    if (text.includes('低风险')) risk_level = '低风险';
    else if (text.includes('致命风险')) risk_level = '致命风险';
    else if (text.includes('高风险')) risk_level = '高风险';

    // 尝试提取信息完整度
    const entropyMatch = text.match(/信息完整度[：:]\s*(\d+)/);
    const entropy = entropyMatch ? parseInt(entropyMatch[1]) : 40;

    // 提取风险因素（找"风险"相关句子）
    const riskFactors: string[] = [];
    const riskSentences = text.match(/[^。！？]*风险[^。！？]*/g);
    if (riskSentences) {
        riskSentences.slice(0, 3).forEach(s => {
            const cleaned = s.replace(/[#\-•🔴🟡🟢]/g, '').trim();
            if (cleaned.length > 5 && cleaned.length < 50) {
                riskFactors.push(cleaned);
            }
        });
    }
    if (riskFactors.length === 0) {
        riskFactors.push('需要进一步分析');
    }

    return {
        score: Math.max(0, Math.min(10, score)),
        risk_level,
        entropy: Math.max(0, Math.min(100, entropy)),
        risk_factors: riskFactors,
        dimensions: {
            logic: score,
            feasibility: score,
            risk: score,
            value: score,
            timing: score,
            resource: score,
        }
    };
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
        addKeyDecision,
        hasSeenGuide,
        setHasSeenGuide
    } = useDecisionStore();

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [];
    const isDebateMode = currentSession?.isDebateMode || false;
    const decisionMode = currentSession?.decisionMode || 'standard';

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 自动调整输入框高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [currentInput]);

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

    const callChatAPI = async (
        apiMessages: Message[],
        opts: {
            sessionId: string;
            isDebateMode: boolean;
            decisionMode: 'fast' | 'standard' | 'complete';
            apiKey: string;
            userMemory: UserMemory;
        }
    ): Promise<string> => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                isDebateMode: opts.isDebateMode,
                decisionMode: opts.decisionMode,
                apiKey: opts.apiKey,
                userMemory: opts.userMemory
            }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponseText = "";
        let isCollectingJSON = false;
        // 支持新旧两种 marker 格式
        const JSON_START_MARKER_REGEX = /JSON_DATA_START|___\*{0,2}JSON_BLOCK_START\*{0,2}___/;
        const guardLen = 'JSON_DATA_START'.length - 1;
        let pendingVisible = "";
        let sseBuffer = "";
        let isFirstChunk = true;

        // 辅助函数：输出可见内容（首块替换占位，后续追加）
        const emitVisible = (text: string) => {
            if (!text) return;
            if (isFirstChunk) {
                updateLastMessage(text, opts.sessionId);
                isFirstChunk = false;
            } else {
                streamMessageChunk(text, opts.sessionId);
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            while (true) {
                const newlineIndex = sseBuffer.indexOf('\n');
                if (newlineIndex === -1) break;

                const rawLine = sseBuffer.slice(0, newlineIndex);
                sseBuffer = sseBuffer.slice(newlineIndex + 1);

                const trimmed = rawLine.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (!content) continue;

                    fullResponseText += content;

                    if (isCollectingJSON) continue;

                    pendingVisible += content;

                    const markerIndex = pendingVisible.search(JSON_START_MARKER_REGEX);
                    if (markerIndex !== -1) {
                        const visiblePart = pendingVisible.slice(0, markerIndex);
                        emitVisible(visiblePart);
                        pendingVisible = "";
                        isCollectingJSON = true;
                        continue;
                    }

                    if (pendingVisible.length > guardLen) {
                        const safeLen = pendingVisible.length - guardLen;
                        const safePart = pendingVisible.slice(0, safeLen);
                        emitVisible(safePart);
                        pendingVisible = pendingVisible.slice(safeLen);
                    }
                } catch (e) {
                    console.error('SSE Error', e);
                }
            }
        }

        sseBuffer += decoder.decode();
        if (sseBuffer.trim().length > 0) {
            const lines = sseBuffer.split('\n');
            for (const rawLine of lines) {
                const trimmed = rawLine.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (!content) continue;

                    fullResponseText += content;
                    if (isCollectingJSON) continue;

                    pendingVisible += content;

                    const markerIndex = pendingVisible.search(JSON_START_MARKER_REGEX);
                    if (markerIndex !== -1) {
                        const visiblePart = pendingVisible.slice(0, markerIndex);
                        emitVisible(visiblePart);
                        pendingVisible = "";
                        isCollectingJSON = true;
                        continue;
                    }

                    if (pendingVisible.length > guardLen) {
                        const safeLen = pendingVisible.length - guardLen;
                        const safePart = pendingVisible.slice(0, safeLen);
                        emitVisible(safePart);
                        pendingVisible = pendingVisible.slice(safeLen);
                    }
                } catch (e) {
                    console.error('SSE Error', e);
                }
            }
        }

        if (!isCollectingJSON && pendingVisible) {
            emitVisible(pendingVisible);
        }

        return fullResponseText;
    };

    const handleSendMessage = async () => {
        if (!currentInput.trim() || isLoading || !currentSessionId) return;

        const sessionIdAtSend = currentSessionId;
        const isDebateModeAtSend = isDebateMode;
        const decisionModeAtSend = decisionMode;
        const apiKeyAtSend = apiKey;
        const userMemoryAtSend = userMemory;

        const userMsg: Message = { role: 'user', content: currentInput };
        addMessage(userMsg, sessionIdAtSend);
        setInput('');
        setLoading(true);

        // 初始占位消息，显示连接状态
        addMessage({ role: 'assistant', content: '正在思考...' }, sessionIdAtSend);

        const MAX_RETRIES = 2;
        let retryCount = 0;
        let fullResponseText = "";
        let analysisData: AnalysisData | null = null;

        try {
            const apiMessages = [...messages, userMsg];
            
            // 首次调用
            fullResponseText = await callChatAPI(apiMessages, {
                sessionId: sessionIdAtSend,
                isDebateMode: isDebateModeAtSend,
                decisionMode: decisionModeAtSend,
                apiKey: apiKeyAtSend,
                userMemory: userMemoryAtSend
            });
            
            // 尝试解析 JSON
            analysisData = parseAnalysisData(fullResponseText);

            const hasJsonCandidate = /JSON_DATA_START|JSON_BLOCK_START|```json|"score"\s*:/.test(fullResponseText);
            if (!analysisData && !hasJsonCandidate) {
                updateLastMessage(fullResponseText.trim(), sessionIdAtSend);
                return;
            }
            
            // 如果解析失败，进行重试
            while (!analysisData && retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`JSON 解析失败，正在重试 (${retryCount}/${MAX_RETRIES})...`);
                
                // 添加重试提示到消息流
                streamMessageChunk(`\n\n🔄 正在重新生成分析数据...`, sessionIdAtSend);
                
                // 构建重试消息，要求重新输出 JSON
                const retryMessages: Message[] = [
                    ...apiMessages,
                    { role: 'assistant', content: fullResponseText },
                    { 
                        role: 'user', 
                        content: '请重新输出JSON数据块，格式：JSON_DATA_START 后跟单行JSON对象，最后 JSON_DATA_END。不要用markdown代码块。' 
                    }
                ];
                
                // 重新调用 API
                const retryResponse = await callChatAPI(retryMessages, {
                    sessionId: sessionIdAtSend,
                    isDebateMode: isDebateModeAtSend,
                    decisionMode: decisionModeAtSend,
                    apiKey: apiKeyAtSend,
                    userMemory: userMemoryAtSend
                });
                
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
                useDecisionStore.getState().setAnalysisData(analysisData, sessionIdAtSend);
                
                // 从分析结果中学习用户画像
                extractAndUpdateUserProfile(analysisData, currentInput, fullResponseText);
                
                // 清理消息中的 JSON 块（支持新旧两种格式）
                const cleanedContent = fullResponseText
                    .replace(/JSON_DATA_START[\s\S]*?JSON_DATA_END/g, '')
                    .replace(/___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g, '')
                    .replace(/```json[\s\S]*?```/g, '')
                    .replace(/🔄 正在重新生成分析数据\.\.\./g, '')
                    .trim();
                updateLastMessage(cleanedContent, sessionIdAtSend);
                
                if (retryCount > 0) {
                    console.log(`JSON 解析成功（重试 ${retryCount} 次）`);
                }
            } else {
                // 所有重试都失败，尝试从文本中兜底提取
                console.warn('JSON 解析最终失败，尝试文本兜底提取');
                const textFallback = extractAnalysisFromText(fullResponseText);
                const fallbackData = textFallback || {
                    score: 5,
                    risk_level: '中等风险' as const,
                    entropy: 40,
                    risk_factors: ['分析数据解析异常，建议重新提问'],
                    dimensions: { logic: 5, feasibility: 5, risk: 5, value: 5, timing: 5, resource: 5 }
                };
                useDecisionStore.getState().setAnalysisData(fallbackData, sessionIdAtSend);
                
                // 清理消息中的 JSON 块
                const cleanedFallback = fullResponseText
                    .replace(/JSON_DATA_START[\s\S]*?JSON_DATA_END/g, '')
                    .replace(/___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g, '')
                    .replace(/```json[\s\S]*?```/g, '')
                    .trim();
                updateLastMessage(cleanedFallback + (textFallback ? '' : '\n\n⚠️ 部分分析数据未能解析，已尽力提取。如需精确分析请重新提问。'), sessionIdAtSend);
            }

        } catch (error) {
            console.error(error);
            // API 完全失败时，更新占位消息为错误提示
            updateLastMessage('⚠️ 抱歉，连接中断或服务异常。请检查网络或 API Key 后重试。', sessionIdAtSend);
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

                {/* 首次使用引导 - 模式选择卡片 */}
                {!hasSeenGuide && messages.length === 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="text-center mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">选择你的决策模式</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                            {/* 快速模式 */}
                            <button
                                onClick={() => { setDecisionMode('fast'); setHasSeenGuide(true); }}
                                className="group glass-card-premium p-5 text-left hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </span>
                                    <span className="font-bold text-emerald-600">快速模式</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">5分钟内获得初步决策建议</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>适合快速验证想法</span>
                                </div>
                            </button>

                            {/* 标准模式 */}
                            <button
                                onClick={() => { setDecisionMode('standard'); setHasSeenGuide(true); }}
                                className="group glass-card-premium p-5 text-left hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </span>
                                    <span className="font-bold text-sky-600">标准模式</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">15分钟深度多维分析</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                    <span>推荐日常重大决策</span>
                                </div>
                            </button>

                            {/* 完整模式 */}
                            <button
                                onClick={() => { setDecisionMode('complete'); setHasSeenGuide(true); }}
                                className="group glass-card-premium p-5 text-left hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </span>
                                    <span className="font-bold text-violet-600">完整模式</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">1小时+战略级全面分析</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    <span>适合人生关键决策</span>
                                </div>
                            </button>
                        </div>
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
                            ref={textareaRef}
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
