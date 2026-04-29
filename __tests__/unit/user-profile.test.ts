/**
 * 单元测试 - 用户画像学习
 * 测试从对话中学习用户决策风格和偏好
 */

import { describe, it, expect } from '@jest/globals';

// 这些函数需要从 chat-area.tsx 中导出
// 由于它们目前是内部函数，我们先测试逻辑

describe('用户画像学习测试', () => {
  describe('extractDomain - 领域提取', () => {
    // 决策领域关键词映射（从 chat-area.tsx 复制）
    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      '投资理财': ['投资', '理财', '股票', '基金', '房产', '买房', '炒股', '收益', '回报'],
      '职业发展': ['跳槽', '辞职', '工作', '职业', '升职', '加薪', '转行', '创业', '副业'],
      '教育学习': ['留学', '考研', '学习', '培训', '考证', '进修', '读书'],
      '生活决策': ['买车', '装修', '搬家', '结婚', '离婚', '生育'],
      '健康医疗': ['手术', '治疗', '体检', '医院', '健康'],
      '人际关系': ['朋友', '家人', '合作', '分手', '社交'],
    };

    function extractDomain(userInput: string): string | null {
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some((kw) => userInput.includes(kw))) {
          return domain;
        }
      }
      return null;
    }

    it('应该识别投资理财领域', () => {
      expect(extractDomain('我想投资股票')).toBe('投资理财');
      expect(extractDomain('考虑买房')).toBe('投资理财');
      expect(extractDomain('基金收益怎么样')).toBe('投资理财');
      expect(extractDomain('房产投资')).toBe('投资理财');
    });

    it('应该识别职业发展领域', () => {
      expect(extractDomain('我想跳槽')).toBe('职业发展');
      expect(extractDomain('考虑创业')).toBe('职业发展');
      expect(extractDomain('要不要辞职')).toBe('职业发展');
      expect(extractDomain('职业转行')).toBe('职业发展');
    });

    it('应该识别教育学习领域', () => {
      expect(extractDomain('想去留学')).toBe('教育学习');
      expect(extractDomain('报个培训班')).toBe('教育学习');
    });

    it('应该识别生活决策领域', () => {
      expect(extractDomain('要不要买车')).toBe('生活决策');
      expect(extractDomain('考虑结婚')).toBe('生活决策');
      expect(extractDomain('房子装修')).toBe('生活决策');
    });

    it('应该识别健康医疗领域', () => {
      expect(extractDomain('要不要做手术')).toBe('健康医疗');
      expect(extractDomain('去医院治疗')).toBe('健康医疗');
    });

    it('应该识别人际关系领域', () => {
      expect(extractDomain('要不要分手')).toBe('人际关系');
      expect(extractDomain('和朋友合作')).toBe('人际关系');
    });

    it('应该返回null对于未知领域', () => {
      expect(extractDomain('今天天气真好')).toBeNull();
      expect(extractDomain('午饭吃什么')).toBeNull();
      expect(extractDomain('你好')).toBeNull();
    });

    it('应该处理包含多个领域关键词的输入', () => {
      // 应该返回第一个匹配的领域
      const result = extractDomain('我想辞职去创业做投资');
      expect(result).not.toBeNull();
      // 可能是"职业发展"或"投资理财"，取决于遍历顺序
    });
  });

  describe('inferDecisionStyle - 风格推断', () => {
    interface AnalysisData {
      score: number;
      risk_level: string;
      entropy: number;
      risk_factors: string[];
      dimensions: {
        logic: number;
        feasibility: number;
        risk: number;
        value: number;
        timing: number;
        resource: number;
      };
    }

    function inferDecisionStyle(
      analysisData: AnalysisData,
      responseText: string
    ): 'conservative' | 'neutral' | 'aggressive' | null {
      const conservativeKeywords = ['保守', '稳健', '谨慎', '风险厌恶', '安全第一'];
      const aggressiveKeywords = ['激进', '冒险', '高风险高回报', '敢于尝试', '大胆'];

      const hasConservative = conservativeKeywords.some((kw) => responseText.includes(kw));
      const hasAggressive = aggressiveKeywords.some((kw) => responseText.includes(kw));

      if (analysisData.risk_level === '低风险' && hasConservative) {
        return 'conservative';
      }
      if (analysisData.risk_level === '高风险' && hasAggressive) {
        return 'aggressive';
      }

      return null;
    }

    it('应该推断保守型风格', () => {
      const analysisData: AnalysisData = {
        score: 7,
        risk_level: '低风险',
        entropy: 70,
        risk_factors: [],
        dimensions: {
          logic: 7,
          feasibility: 7,
          risk: 8,
          value: 7,
          timing: 7,
          resource: 7,
        },
      };
      const responseText = '建议采取保守稳健的策略，优先考虑安全性';

      const style = inferDecisionStyle(analysisData, responseText);
      expect(style).toBe('conservative');
    });

    it('应该推断激进型风格', () => {
      const analysisData: AnalysisData = {
        score: 6,
        risk_level: '高风险',
        entropy: 70,
        risk_factors: ['市场波动大'],
        dimensions: {
          logic: 6,
          feasibility: 6,
          risk: 4,
          value: 7,
          timing: 6,
          resource: 6,
        },
      };
      const responseText = '可以大胆尝试，高风险高回报，敢于冒险';

      const style = inferDecisionStyle(analysisData, responseText);
      expect(style).toBe('aggressive');
    });

    it('应该在信息不足时返回null', () => {
      const analysisData: AnalysisData = {
        score: 5,
        risk_level: '中等风险',
        entropy: 30,
        risk_factors: [],
        dimensions: {
          logic: 5,
          feasibility: 5,
          risk: 5,
          value: 5,
          timing: 5,
          resource: 5,
        },
      };
      const responseText = '需要更多信息才能判断';

      const style = inferDecisionStyle(analysisData, responseText);
      expect(style).toBeNull();
    });

    it('应该在风格不明确时返回null', () => {
      const analysisData: AnalysisData = {
        score: 6,
        risk_level: '中等风险',
        entropy: 70,
        risk_factors: [],
        dimensions: {
          logic: 6,
          feasibility: 6,
          risk: 6,
          value: 6,
          timing: 6,
          resource: 6,
        },
      };
      const responseText = '这是一个需要平衡考虑的决策';

      const style = inferDecisionStyle(analysisData, responseText);
      expect(style).toBeNull();
    });
  });

  describe('风险承受度计算', () => {
    it('应该根据风险等级计算风险分数', () => {
      function getRiskScore(riskLevel: string): number {
        if (riskLevel === '低风险') return 3;
        if (riskLevel === '中等风险') return 5;
        if (riskLevel === '高风险') return 7;
        if (riskLevel === '致命风险') return 9;
        return 5;
      }

      expect(getRiskScore('低风险')).toBe(3);
      expect(getRiskScore('中等风险')).toBe(5);
      expect(getRiskScore('高风险')).toBe(7);
      expect(getRiskScore('致命风险')).toBe(9);
    });

    it('应该使用移动平均更新风险承受度', () => {
      function updateRiskTolerance(current: number, newRisk: number): number {
        return Math.round(current * 0.7 + newRisk * 0.3);
      }

      // 当前风险承受度5，新风险7
      expect(updateRiskTolerance(5, 7)).toBe(6); // 5*0.7 + 7*0.3 = 5.6 ≈ 6

      // 当前风险承受度7，新风险3
      expect(updateRiskTolerance(7, 3)).toBe(6); // 7*0.7 + 3*0.3 = 5.8 ≈ 6

      // 当前风险承受度5，新风险5
      expect(updateRiskTolerance(5, 5)).toBe(5); // 保持不变
    });
  });

  describe('决策结果分类', () => {
    it('应该根据评分分类决策结果', () => {
      function classifyResult(score: number): string {
        if (score >= 7) return '推荐执行';
        if (score >= 5) return '谨慎考虑';
        return '不建议';
      }

      expect(classifyResult(9)).toBe('推荐执行');
      expect(classifyResult(7)).toBe('推荐执行');
      expect(classifyResult(6)).toBe('谨慎考虑');
      expect(classifyResult(5)).toBe('谨慎考虑');
      expect(classifyResult(4)).toBe('不建议');
      expect(classifyResult(2)).toBe('不建议');
    });
  });

  describe('关键决策记录', () => {
    it('应该只记录信息充足的决策', () => {
      function shouldRecordDecision(entropy: number): boolean {
        return entropy >= 60;
      }

      expect(shouldRecordDecision(80)).toBe(true);
      expect(shouldRecordDecision(60)).toBe(true);
      expect(shouldRecordDecision(59)).toBe(false);
      expect(shouldRecordDecision(30)).toBe(false);
    });

    it('应该截断过长的决策主题', () => {
      function truncateTopic(topic: string, maxLength: number = 30): string {
        if (topic.length <= maxLength) return topic;
        return topic.slice(0, maxLength) + '...';
      }

      const longTopic = '我有100万启动资金，打算在北京开一家咖啡店，有3年餐饮管理经验';
      const truncated = truncateTopic(longTopic, 30);

      expect(truncated.length).toBeLessThanOrEqual(33); // 30 + '...'
      expect(truncated.endsWith('...')).toBe(true);

      const shortTopic = '我想创业';
      expect(truncateTopic(shortTopic, 30)).toBe(shortTopic);
    });
  });

  describe('领域频率统计', () => {
    it('应该限制常用领域数量', () => {
      function addDomain(
        currentDomains: string[],
        newDomain: string,
        maxCount: number = 5
      ): string[] {
        if (currentDomains.includes(newDomain)) {
          return currentDomains;
        }
        return [...currentDomains, newDomain].slice(-maxCount);
      }

      let domains: string[] = [];

      // 添加6个领域
      domains = addDomain(domains, '投资理财');
      domains = addDomain(domains, '职业发展');
      domains = addDomain(domains, '教育学习');
      domains = addDomain(domains, '生活决策');
      domains = addDomain(domains, '健康医疗');
      domains = addDomain(domains, '人际关系');

      // 应该只保留最新的5个
      expect(domains.length).toBe(5);
      expect(domains[0]).toBe('职业发展'); // 第一个被移除
      expect(domains[4]).toBe('人际关系'); // 最后一个保留
    });

    it('应该避免重复添加相同领域', () => {
      function addDomain(
        currentDomains: string[],
        newDomain: string,
        maxCount: number = 5
      ): string[] {
        if (currentDomains.includes(newDomain)) {
          return currentDomains;
        }
        return [...currentDomains, newDomain].slice(-maxCount);
      }

      let domains = ['投资理财', '职业发展'];

      domains = addDomain(domains, '投资理财');
      expect(domains.length).toBe(2); // 不应该增加

      domains = addDomain(domains, '教育学习');
      expect(domains.length).toBe(3); // 应该增加
    });
  });
});
