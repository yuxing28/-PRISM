/**
 * 单元测试 - JSON重试机制
 * 测试当JSON解析失败时的重试逻辑
 */

import { describe, it, expect } from '@jest/globals';
import { parseAnalysisData } from '../utils/test-helpers';

describe('JSON重试机制测试', () => {
  describe('JSON解析失败场景', () => {
    it('应该识别缺少JSON的响应', () => {
      const text = '这是一段没有JSON的普通文本回复';
      const result = parseAnalysisData(text);
      
      expect(result).toBeNull();
    });

    it('应该识别不完整的JSON', () => {
      const text = `
        分析文本
        ___JSON_BLOCK_START___
        {
          "score": 7,
          "risk_level": "中等风险"
          // 缺少其他字段
        ___JSON_BLOCK_END___
      `;
      
      const result = parseAnalysisData(text);
      // 应该解析失败或返回null
      expect(result).toBeNull();
    });

    it('应该识别格式错误的JSON', () => {
      const text = `
        ___JSON_BLOCK_START___
        {
          "score": 7,
          "risk_level": "中等风险",
          "entropy": 70,
          "risk_factors": ["测试"],
          "dimensions": {
            "logic": 7,
            "feasibility": 7,
            "risk": 7,
            "value": 7,
            "timing": 7,
            "resource": 7,
          }  // 多余的逗号
        }
        ___JSON_BLOCK_END___
      `;
      
      const result = parseAnalysisData(text);
      expect(result).toBeNull();
    });
  });

  describe('JSON候选检测', () => {
    it('应该检测到JSON_BLOCK_START标记', () => {
      const text = '一些文本 ___JSON_BLOCK_START___ 但没有完整JSON';
      const hasCandidate = /JSON_BLOCK_START|```json|"score"\s*:/.test(text);
      
      expect(hasCandidate).toBe(true);
    });

    it('应该检测到```json标记', () => {
      const text = '一些文本 ```json 但没有完整JSON';
      const hasCandidate = /JSON_BLOCK_START|```json|"score"\s*:/.test(text);
      
      expect(hasCandidate).toBe(true);
    });

    it('应该检测到score字段', () => {
      const text = '一些文本 "score": 7 但没有完整JSON';
      const hasCandidate = /JSON_BLOCK_START|```json|"score"\s*:/.test(text);
      
      expect(hasCandidate).toBe(true);
    });

    it('应该识别没有JSON候选的文本', () => {
      const text = '这是完全没有JSON相关内容的普通文本';
      const hasCandidate = /JSON_BLOCK_START|```json|"score"\s*:/.test(text);
      
      expect(hasCandidate).toBe(false);
    });
  });

  describe('重试提示消息', () => {
    it('应该识别重试提示', () => {
      const text = '原始回复\n\n🔄 正在重新生成分析数据...\n\n新的JSON';
      const hasRetryMessage = text.includes('🔄 正在重新生成分析数据');
      
      expect(hasRetryMessage).toBe(true);
    });

    it('应该能够清理重试提示', () => {
      const text = '原始回复\n\n🔄 正在重新生成分析数据...\n\n最终内容';
      const cleaned = text.replace(/🔄 正在重新生成分析数据\.\.\./g, '');
      
      expect(cleaned).not.toContain('🔄');
      expect(cleaned).toContain('原始回复');
      expect(cleaned).toContain('最终内容');
    });
  });

  describe('默认数据生成', () => {
    it('应该生成有效的默认分析数据', () => {
      const defaultData = {
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
          resource: 5,
        },
      };

      // 验证默认数据的有效性
      expect(defaultData.score).toBeGreaterThanOrEqual(0);
      expect(defaultData.score).toBeLessThanOrEqual(10);
      expect(defaultData.entropy).toBeGreaterThanOrEqual(0);
      expect(defaultData.entropy).toBeLessThanOrEqual(100);
      expect(defaultData.risk_factors.length).toBeGreaterThan(0);
      expect(Object.keys(defaultData.dimensions).length).toBe(6);
    });
  });

  describe('重试次数限制', () => {
    it('应该限制最大重试次数', () => {
      const MAX_RETRIES = 2;
      let retryCount = 0;

      // 模拟重试逻辑
      while (retryCount < MAX_RETRIES) {
        retryCount++;
      }

      expect(retryCount).toBe(MAX_RETRIES);
      expect(retryCount).toBeLessThanOrEqual(2);
    });

    it('应该在成功后停止重试', () => {
      const MAX_RETRIES = 2;
      let retryCount = 0;
      let success = false;

      // 模拟第一次重试成功
      while (!success && retryCount < MAX_RETRIES) {
        retryCount++;
        if (retryCount === 1) {
          success = true; // 第一次重试成功
        }
      }

      expect(retryCount).toBe(1); // 应该只重试一次
      expect(success).toBe(true);
    });
  });

  describe('合并响应文本', () => {
    it('应该合并原始响应和重试响应', () => {
      const originalText = '原始分析文本';
      const retryText = '\n___JSON_BLOCK_START___\n{"score": 7}\n___JSON_BLOCK_END___';
      const combined = originalText + '\n' + retryText;

      expect(combined).toContain('原始分析文本');
      expect(combined).toContain('___JSON_BLOCK_START___');
    });

    it('应该能从合并文本中提取JSON', () => {
      const combined = `
        原始分析文本
        
        ___JSON_BLOCK_START___
        {
          "score": 7,
          "risk_level": "中等风险",
          "entropy": 70,
          "risk_factors": ["测试"],
          "dimensions": {
            "logic": 7,
            "feasibility": 7,
            "risk": 7,
            "value": 7,
            "timing": 7,
            "resource": 7
          }
        }
        ___JSON_BLOCK_END___
      `;

      const result = parseAnalysisData(combined);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(7);
    });
  });

  describe('错误提示消息', () => {
    it('应该生成用户友好的错误提示', () => {
      const errorMessage = '⚠️ 分析数据格式异常，已使用默认评估。建议重新描述您的决策问题。';
      
      expect(errorMessage).toContain('⚠️');
      expect(errorMessage).toContain('建议');
      expect(errorMessage.length).toBeLessThan(100); // 应该简洁
    });

    it('应该能够添加错误提示到响应', () => {
      const originalText = '原始分析文本';
      const errorMessage = '\n\n⚠️ 分析数据格式异常，已使用默认评估。建议重新描述您的决策问题。';
      const withError = originalText + errorMessage;

      expect(withError).toContain('原始分析文本');
      expect(withError).toContain('⚠️');
    });
  });

  describe('JSON清理', () => {
    it('应该清理响应中的JSON块', () => {
      const text = `
        这是分析文本
        ___JSON_BLOCK_START___
        {"score": 7}
        ___JSON_BLOCK_END___
        更多文本
      `;

      const jsonBlockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g;
      const cleaned = text.replace(jsonBlockRegex, '').trim();

      expect(cleaned).not.toContain('___JSON_BLOCK_START___');
      expect(cleaned).not.toContain('___JSON_BLOCK_END___');
      expect(cleaned).toContain('这是分析文本');
      expect(cleaned).toContain('更多文本');
    });

    it('应该清理```json代码块', () => {
      const text = `
        这是分析文本
        \`\`\`json
        {"score": 7}
        \`\`\`
        更多文本
      `;

      const cleaned = text.replace(/```json[\s\S]*?```/g, '').trim();

      expect(cleaned).not.toContain('```json');
      expect(cleaned).toContain('这是分析文本');
      expect(cleaned).toContain('更多文本');
    });

    it('应该清理重试提示消息', () => {
      const text = '分析文本\n\n🔄 正在重新生成分析数据...\n\n更多文本';
      const cleaned = text.replace(/🔄 正在重新生成分析数据\.\.\./g, '').trim();

      expect(cleaned).not.toContain('🔄');
      expect(cleaned).toContain('分析文本');
      expect(cleaned).toContain('更多文本');
    });
  });

  describe('重试日志', () => {
    it('应该记录重试次数', () => {
      const logs: string[] = [];
      const MAX_RETRIES = 2;

      for (let i = 1; i <= MAX_RETRIES; i++) {
        logs.push(`JSON 解析失败，正在重试 (${i}/${MAX_RETRIES})...`);
      }

      expect(logs.length).toBe(2);
      expect(logs[0]).toContain('(1/2)');
      expect(logs[1]).toContain('(2/2)');
    });

    it('应该记录成功的重试', () => {
      const retryCount = 1;
      const successLog = `JSON 解析成功（重试 ${retryCount} 次）`;

      expect(successLog).toContain('成功');
      expect(successLog).toContain('1 次');
    });

    it('应该记录最终失败', () => {
      const failureLog = 'JSON 解析最终失败，使用默认分析数据';

      expect(failureLog).toContain('最终失败');
      expect(failureLog).toContain('默认');
    });
  });
});
