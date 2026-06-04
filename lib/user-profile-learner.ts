/**
 * 用户画像学习模块
 * 从 AI 分析结果中提取用户决策风格、风险承受度等信息
 */

import type { AnalysisData } from '@/lib/json-parser';

const DOMAIN_KEYWORDS: Record<string, string[]> = {
    '投资理财': ['投资', '理财', '股票', '基金', '房产', '买房', '炒股', '收益', '回报'],
    '职业发展': ['跳槽', '辞职', '工作', '职业', '升职', '加薪', '转行', '创业', '副业'],
    '教育学习': ['留学', '考研', '学习', '培训', '考证', '进修', '读书'],
    '生活决策': ['买车', '装修', '搬家', '结婚', '离婚', '生育'],
    '健康医疗': ['手术', '治疗', '体检', '医院', '健康'],
    '人际关系': ['朋友', '家人', '合作', '分手', '社交'],
};

export function extractDomain(userInput: string): string | null {
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some(kw => userInput.includes(kw))) return domain;
    }
    return null;
}

export function inferDecisionStyle(
    analysisData: AnalysisData, 
    responseText: string
): 'conservative' | 'neutral' | 'aggressive' | null {
    const conservativeKeywords = ['保守', '稳健', '谨慎', '风险厌恶', '安全第一'];
    const aggressiveKeywords = ['激进', '冒险', '高风险高回报', '敢于尝试', '大胆'];
    
    const hasConservative = conservativeKeywords.some(kw => responseText.includes(kw));
    const hasAggressive = aggressiveKeywords.some(kw => responseText.includes(kw));
    
    if (analysisData.risk_level === '低风险' && hasConservative) return 'conservative';
    if (analysisData.risk_level === '高风险' && hasAggressive) return 'aggressive';
    
    return null;
}

interface UserProfileUpdates {
    frequentDomains?: string[];
    decisionStyle?: 'conservative' | 'neutral' | 'aggressive' | 'unknown';
    riskTolerance?: number;
    preferredMode?: 'fast' | 'standard' | 'complete' | 'unknown';
}

export function extractUserProfileUpdates(
    analysisData: AnalysisData,
    userInput: string,
    responseText: string,
    currentDomains: string[],
    currentStyle: string,
    currentTolerance: number,
    currentPreferredMode: string,
    decisionMode: string,
    entropyThreshold: number = 50
): UserProfileUpdates | null {
    if (analysisData.entropy < entropyThreshold) return null;

    const updates: UserProfileUpdates = {};
    let hasUpdates = false;

    // 提取决策领域
    const domain = extractDomain(userInput);
    if (domain && !currentDomains.includes(domain)) {
        updates.frequentDomains = [...currentDomains, domain].slice(-5);
        hasUpdates = true;
    }

    // 推断决策风格
    if (currentStyle === 'unknown') {
        const inferred = inferDecisionStyle(analysisData, responseText);
        if (inferred) {
            updates.decisionStyle = inferred;
            hasUpdates = true;
        }
    }

    // 更新风险承受度
    const riskScore = analysisData.risk_level === '低风险' ? 3 
        : analysisData.risk_level === '中等风险' ? 5 
        : analysisData.risk_level === '高风险' ? 7 
        : 9;
    updates.riskTolerance = Math.round((currentTolerance * 0.7) + (riskScore * 0.3));
    hasUpdates = true;

    // 记录偏好模式
    if (currentPreferredMode === 'unknown') {
        updates.preferredMode = decisionMode as 'fast' | 'standard' | 'complete' | 'unknown';
        hasUpdates = true;
    }

    return hasUpdates ? updates : null;
}
