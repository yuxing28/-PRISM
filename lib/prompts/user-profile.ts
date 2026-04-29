/**
 * 用户画像 Prompt 构建器
 * 根据用户历史行为生成个性化 system prompt 片段
 */

interface UserMemory {
    decisionStyle: string;
    riskTolerance: number;
    frequentDomains: string[];
    keyDecisions: Array<{
        topic: string;
        result: string;
        score: number;
        riskLevel: string;
        date: number;
    }>;
    preferredMode: string;
}

const STYLE_MAP: Record<string, string> = {
    conservative: '保守型（偏好低风险、稳健的选择）',
    neutral: '中性型（风险与收益平衡）',
    aggressive: '激进型（愿意承担较高风险追求高回报）',
};

/**
 * 构建用户画像 Prompt 片段
 */
export function buildUserProfilePrompt(userMemory: UserMemory): string {
    const parts: string[] = ['【用户画像 - 基于历史对话学习】'];

    if (userMemory.decisionStyle !== 'unknown') {
        parts.push(`决策风格：${STYLE_MAP[userMemory.decisionStyle] || userMemory.decisionStyle}`);
    }

    parts.push(`风险承受度：${userMemory.riskTolerance}/10`);

    if (userMemory.frequentDomains.length > 0) {
        parts.push(`常咨询领域：${userMemory.frequentDomains.slice(0, 5).join('、')}`);
    }

    if (userMemory.keyDecisions.length > 0) {
        const recentDecisions = userMemory.keyDecisions.slice(0, 3);
        const summaries = recentDecisions.map(
            d => `${d.topic}（评分${d.score}/10，${d.riskLevel}，建议${d.result}）`
        );
        parts.push(`近期决策记录：\n${summaries.join('\n')}`);
    }

    parts.push('');
    parts.push('【应用规则】根据用户画像调整分析风格：');
    parts.push('保守型用户：更强调风险，建议更谨慎');
    parts.push('激进型用户：可以更多讨论机会，但仍需指出风险');
    parts.push('参考历史决策，保持建议的一致性');

    return parts.join('\n');
}
