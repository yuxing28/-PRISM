/**
 * JSON 解析验证模块
 * 从 AI 回复中提取并验证结构化分析数据
 */

export interface DimensionScores {
    logic: number;
    feasibility: number;
    risk: number;
    value: number;
    timing: number;
    resource: number;
}

export interface AnalysisData {
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

function validateDimensionScore(value: unknown): number {
    const num = Number(value);
    if (isNaN(num)) return 5;
    return Math.max(0, Math.min(10, Math.round(num)));
}

export function validateAndFixAnalysisData(data: unknown): AnalysisData | null {
    if (!data || typeof data !== 'object') return null;
    
    const raw = data as Record<string, unknown>;
    
    try {
        const rawDimensions = (raw.dimensions || {}) as Record<string, unknown>;
        const dimensions: DimensionScores = {
            logic: validateDimensionScore(rawDimensions.logic),
            feasibility: validateDimensionScore(rawDimensions.feasibility),
            risk: validateDimensionScore(rawDimensions.risk),
            value: validateDimensionScore(rawDimensions.value),
            timing: validateDimensionScore(rawDimensions.timing),
            resource: validateDimensionScore(rawDimensions.resource),
        };

        const rawScore = raw.score;
        let score = (rawScore === null || rawScore === undefined) ? NaN : Number(rawScore);
        const dimensionScores = Object.values(dimensions);
        const avgScore = dimensionScores.reduce((sum, val) => sum + val, 0) / dimensionScores.length;
        if (isNaN(score)) score = avgScore;
        if (isNaN(score)) score = 5;
        score = Math.max(0, Math.min(10, Math.round(score)));
        if (score === 0) score = Math.max(1, Math.min(10, Math.round(avgScore)));
        
        let risk_level = String(raw.risk_level || '');
        if (!VALID_RISK_LEVELS.includes(risk_level)) {
            if (risk_level.includes('低') || risk_level.toLowerCase().includes('low')) {
                risk_level = '低风险';
            } else if (risk_level.includes('致命') || risk_level.toLowerCase().includes('fatal')) {
                risk_level = '致命风险';
            } else if (risk_level.includes('高') || risk_level.toLowerCase().includes('high')) {
                risk_level = '高风险';
            } else {
                risk_level = '中等风险';
            }
        }
        
        let entropy = Number(raw.entropy);
        if (isNaN(entropy)) entropy = 50;
        entropy = Math.max(0, Math.min(100, Math.round(entropy)));
        
        let risk_factors: string[] = [];
        if (Array.isArray(raw.risk_factors)) {
            risk_factors = raw.risk_factors
                .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                .slice(0, 10);
        }
        if (risk_factors.length === 0) risk_factors = ['需要进一步分析'];

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
            score, risk_level, entropy, risk_factors, dimensions,
            decision_type, min_viable_action, stop_loss, escalation,
            score_interpretation, risk_priorities, mode_recommendation, info_progress
        };
    } catch (e) {
        console.error('Analysis data validation failed:', e);
        return null;
    }
}

export function extractJsonBlock(text: string): string | null {
    const dataMarkerRegex = /JSON_DATA_START\s*([\s\S]*?)\s*JSON_DATA_END/g;
    const dataMatches = Array.from(text.matchAll(dataMarkerRegex));
    if (dataMatches.length > 0) {
        const last = dataMatches[dataMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }

    const blockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___([\s\S]*?)___\*{0,2}JSON_BLOCK_END\*{0,2}___/g;
    const blockMatches = Array.from(text.matchAll(blockRegex));
    if (blockMatches.length > 0) {
        const last = blockMatches[blockMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }
    
    const codeBlockRegex = /```json\s*([\s\S]*?)```/g;
    const codeMatches = Array.from(text.matchAll(codeBlockRegex));
    if (codeMatches.length > 0) {
        const last = codeMatches[codeMatches.length - 1];
        return (last?.[1] ?? '').trim() || null;
    }
    
    const jsonObjectRegex = /\{\s*"score"[\s\S]*?"dimensions"[\s\S]*?\}/g;
    const matches = text.match(jsonObjectRegex);
    if (matches && matches.length > 0) return matches[matches.length - 1];
    
    return null;
}

export function extractAnalysisFromText(text: string): AnalysisData | null {
    const scoreMatch = text.match(/综合评分[：:]\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

    let risk_level = '中等风险';
    if (text.includes('低风险')) risk_level = '低风险';
    else if (text.includes('致命风险')) risk_level = '致命风险';
    else if (text.includes('高风险')) risk_level = '高风险';

    const entropyMatch = text.match(/信息完整度[：:]\s*(\d+)/);
    const entropy = entropyMatch ? parseInt(entropyMatch[1]) : 40;

    const riskFactors: string[] = [];
    const riskSentences = text.match(/[^。！？]*风险[^。！？]*/g);
    if (riskSentences) {
        riskSentences.slice(0, 3).forEach(s => {
            const cleaned = s.replace(/[#\-•🔴🟡🟢]/g, '').trim();
            if (cleaned.length > 5 && cleaned.length < 50) riskFactors.push(cleaned);
        });
    }
    if (riskFactors.length === 0) riskFactors.push('需要进一步分析');

    return {
        score: Math.max(0, Math.min(10, score)),
        risk_level,
        entropy: Math.max(0, Math.min(100, entropy)),
        risk_factors: riskFactors,
        dimensions: { logic: score, feasibility: score, risk: score, value: score, timing: score, resource: score }
    };
}

export function parseAnalysisData(text: string): AnalysisData | null {
    const jsonStr = extractJsonBlock(text);
    if (!jsonStr) return null;
    
    try {
        const parsed = JSON.parse(jsonStr);
        return validateAndFixAnalysisData(parsed);
    } catch {
        try {
            const fixed = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\r\n]+/g, ' ');
            const parsed = JSON.parse(fixed);
            return validateAndFixAnalysisData(parsed);
        } catch {
            return null;
        }
    }
}

export function cleanJsonFromText(text: string): string {
    return text
        .replace(/JSON_DATA_START[\s\S]*?JSON_DATA_END/g, '')
        .replace(/___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/🔄 正在重新生成分析数据\.\.\./g, '')
        .trim();
}
