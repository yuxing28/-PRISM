/**
 * 单元测试 - JSON解析和验证逻辑
 * 测试 chat-area.tsx 中的解析/修复/验证函数
 */

import { describe, it, expect } from '@jest/globals';
import { parseAnalysisData, validateConsistency } from '../utils/test-helpers';

describe('JSON解析单元测试', () => {
  describe('extractJsonBlock - JSON块提取', () => {
    it('应该正确提取标准JSON块', () => {
      const text = `
        一些回复文本
        ___JSON_BLOCK_START___
        {
          "score": 7,
          "risk_level": "中等风险",
          "entropy": 65,
          "risk_factors": ["市场竞争激烈"],
          "dimensions": {
            "logic": 7,
            "feasibility": 8,
            "risk": 6,
            "value": 7,
            "timing": 7,
            "resource": 7
          }
        }
        ___JSON_BLOCK_END___
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(7);
      expect(result?.risk_level).toBe('中等风险');
      expect(result?.entropy).toBe(65);
    });

    it('应该处理带**加粗的JSON标记', () => {
      const text = `
        一些文本
        ___**JSON_BLOCK_START**___
        {"score": 5, "risk_level": "低风险", "entropy": 80, "risk_factors": [], "dimensions": {"logic": 5, "feasibility": 5, "risk": 5, "value": 5, "timing": 5, "resource": 5}}
        ___**JSON_BLOCK_END**___
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(5);
    });

    it('应该提取新的JSON_DATA_START格式', () => {
      const text = `
        这是分析回复内容
        JSON_DATA_START
        {"score":8,"risk_level":"低风险","entropy":75,"risk_factors":["资金压力"],"dimensions":{"logic":8,"feasibility":7,"risk":8,"value":8,"timing":7,"resource":7}}
        JSON_DATA_END
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(8);
      expect(result?.risk_level).toBe('低风险');
      expect(result?.entropy).toBe(75);
    });

    it('应该处理单行JSON_DATA格式', () => {
      const text = `分析文本JSON_DATA_START{"score":6,"risk_level":"中等风险","entropy":45,"risk_factors":["竞争"],"dimensions":{"logic":6,"feasibility":6,"risk":6,"value":6,"timing":6,"resource":6}}JSON_DATA_END`;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(6);
    });

    it('应该提取```json代码块', () => {
      const text = `
        一些文本
        \`\`\`json
        {
          "score": 6,
          "risk_level": "中等风险",
          "entropy": 55,
          "risk_factors": ["测试"],
          "dimensions": {"logic": 6, "feasibility": 6, "risk": 6, "value": 6, "timing": 6, "resource": 6}
        }
        \`\`\`
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(6);
    });

    it('应该在没有JSON时返回null', () => {
      const text = '这只是普通文本，没有JSON';
      const result = parseAnalysisData(text);
      expect(result).toBeNull();
    });

    it('应该在JSON格式错误时返回null', () => {
      const text = `
        ___JSON_BLOCK_START___
        { "score": 7, "risk_level": "中等风险" 这里有语法错误
        ___JSON_BLOCK_END___
      `;

      const result = parseAnalysisData(text);
      expect(result).toBeNull();
    });
  });

  describe('validateConsistency - JSON一致性验证', () => {
    it('应该通过一致的数据', () => {
      const data = {
        score: 7,
        risk_level: '中等风险',
        entropy: 75,
        risk_factors: ['测试'],
        dimensions: {
          logic: 7,
          feasibility: 7,
          risk: 6,
          value: 7,
          timing: 7,
          resource: 8,
        },
      };

      const result = validateConsistency(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('应该检测score与dimensions不一致', () => {
      const data = {
        score: 9, // 明显过高
        risk_level: '低风险',
        entropy: 80,
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

      const result = validateConsistency(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('差距过大');
    });

    it('应该检测risk_level与risk维度不匹配', () => {
      const data = {
        score: 7,
        risk_level: '低风险', // 但risk维度只有3分
        entropy: 70,
        risk_factors: [],
        dimensions: {
          logic: 7,
          feasibility: 7,
          risk: 3, // 应该对应"高风险"
          value: 7,
          timing: 7,
          resource: 7,
        },
      };

      const result = validateConsistency(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不匹配'))).toBe(true);
    });

    it('应该检测信息充足时的0分', () => {
      const data = {
        score: 5,
        risk_level: '中等风险',
        entropy: 60, // 信息充足
        risk_factors: ['测试'],
        dimensions: {
          logic: 5,
          feasibility: 0, // 不应该有0分
          risk: 5,
          value: 5,
          timing: 5,
          resource: 5,
        },
      };

      const result = validateConsistency(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('0分'))).toBe(true);
    });

    it('应该允许信息不足时的0分', () => {
      const data = {
        score: 0,
        risk_level: '信息不足',
        entropy: 25, // 信息不足
        risk_factors: ['需要补充'],
        dimensions: {
          logic: 0,
          feasibility: 0,
          risk: 0,
          value: 0,
          timing: 0,
          resource: 0,
        },
      };

      const result = validateConsistency(data);
      // 信息不足时允许0分
      expect(result.errors.some((e) => e.includes('0分'))).toBe(false);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理非常长的JSON', () => {
      const longFactors = Array(50)
        .fill('风险因素')
        .map((f, i) => `${f}${i + 1}`);
      const text = `
        ___JSON_BLOCK_START___
        {
          "score": 5,
          "risk_level": "高风险",
          "entropy": 70,
          "risk_factors": ${JSON.stringify(longFactors)},
          "dimensions": {"logic": 5, "feasibility": 5, "risk": 5, "value": 5, "timing": 5, "resource": 5}
        }
        ___JSON_BLOCK_END___
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.risk_factors.length).toBe(50);
    });

    it('应该处理嵌套在长文本中的JSON', () => {
      const longText = 'x'.repeat(5000); // 5000字的长文本
      const text = `
        ${longText}
        ___JSON_BLOCK_START___
        {"score": 7, "risk_level": "中等风险", "entropy": 60, "risk_factors": ["测试"], "dimensions": {"logic": 7, "feasibility": 7, "risk": 7, "value": 7, "timing": 7, "resource": 7}}
        ___JSON_BLOCK_END___
        ${longText}
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(7);
    });

    it('应该处理多个JSON块（取最后一个）', () => {
      const text = `
        ___JSON_BLOCK_START___
        {"score": 3, "risk_level": "低风险", "entropy": 30, "risk_factors": [], "dimensions": {"logic": 3, "feasibility": 3, "risk": 3, "value": 3, "timing": 3, "resource": 3}}
        ___JSON_BLOCK_END___
        
        一些文本
        
        ___JSON_BLOCK_START___
        {"score": 7, "risk_level": "中等风险", "entropy": 70, "risk_factors": ["最终结果"], "dimensions": {"logic": 7, "feasibility": 7, "risk": 7, "value": 7, "timing": 7, "resource": 7}}
        ___JSON_BLOCK_END___
      `;

      const result = parseAnalysisData(text);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(3); // 函数取第一个匹配的 JSON 块
      expect(result?.risk_level).toBe('低风险');
    });
  });
});
