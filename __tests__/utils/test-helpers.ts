/**
 * 测试辅助工具函数
 */

import { Message } from '@/lib/store';
import { TEST_CONFIG } from '../setup';
import { getMockResponse as getResponse, adjustResponseByMode, getMockResponseWithContext } from '../mocks/responses';

export interface AnalysisData {
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

/**
 * 调用Chat API
 */
export async function callChatAPI(
  userInput: string,
  options: {
    mode?: 'fast' | 'standard' | 'complete';
    isDebateMode?: boolean;
    previousMessages?: Message[];
  } = {}
): Promise<{ fullText: string; analysisData: AnalysisData | null }> {
  const {
    mode = 'standard',
    isDebateMode = false,
    previousMessages = [],
  } = options;

  if (TEST_CONFIG.MOCK_MODE) {
    // Mock模式：返回模拟数据
    return getMockResponse(userInput, mode, previousMessages);
  }

  const messages: Message[] = [
    ...previousMessages,
    { role: 'user', content: userInput },
  ];

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      isDebateMode,
      decisionMode: mode,
      apiKey: TEST_CONFIG.API_KEY,
      userMemory: {
        decisionStyle: 'unknown',
        riskTolerance: 5,
        frequentDomains: [],
        keyDecisions: [],
        preferredMode: 'unknown',
        lastUpdated: Date.now(),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  // 解析SSE流
  let fullText = '';
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) fullText += content;
      } catch {
        // 忽略解析错误
      }
    }
  }

  // 解析JSON
  const analysisData = parseAnalysisData(fullText);

  return { fullText, analysisData };
}

/**
 * 从文本中提取JSON块（支持新旧两种格式）
 */
function extractJsonBlock(text: string): string | null {
  // 新格式: JSON_DATA_START ... JSON_DATA_END
  const dataMarkerRegex = /JSON_DATA_START\s*([\s\S]*?)\s*JSON_DATA_END/;
  const dataMatch = text.match(dataMarkerRegex);
  if (dataMatch) return dataMatch[1].trim();

  // 旧格式: ___JSON_BLOCK_START___ ... ___JSON_BLOCK_END___
  const blockRegex = /___\*{0,2}JSON_BLOCK_START\*{0,2}___([\s\S]*?)___\*{0,2}JSON_BLOCK_END\*{0,2}___/;
  const match = text.match(blockRegex);
  if (match) return match[1].trim();

  // markdown 代码块
  const codeBlockRegex = /```json\s*([\s\S]*?)```/;
  const codeMatch = text.match(codeBlockRegex);
  if (codeMatch) return codeMatch[1].trim();

  return null;
}

/**
 * 解析分析数据
 */
export function parseAnalysisData(text: string): AnalysisData | null {
  const jsonStr = extractJsonBlock(text);
  if (!jsonStr) return null;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON解析失败:', e);
    return null;
  }
}

/**
 * 获取纯文本（移除JSON块，支持新旧格式）
 */
export function getCleanText(fullText: string): string {
  return fullText
    .replace(/JSON_DATA_START[\s\S]*?JSON_DATA_END/g, '')
    .replace(/___\*{0,2}JSON_BLOCK_START\*{0,2}___[\s\S]*?___\*{0,2}JSON_BLOCK_END\*{0,2}___/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .trim();
}

/**
 * Mock响应生成器（用于快速测试）
 */
function getMockResponse(
  userInput: string,
  mode: string,
  previousMessages: Message[] = []
): { fullText: string; analysisData: AnalysisData | null } {
  // 使用新的Mock数据库

  // 如果有历史消息，使用上下文感知的Mock
  let mockResponse;
  if (previousMessages.length > 0) {
    mockResponse = getMockResponseWithContext(userInput, previousMessages, mode as 'fast' | 'standard' | 'complete');
  } else {
    mockResponse = getResponse(userInput, mode as 'fast' | 'standard' | 'complete');
  }
  
  const adjustedResponse = adjustResponseByMode(mockResponse, mode as 'fast' | 'standard' | 'complete');
  
  // 如果没有数据（非决策场景），直接返回文本
  if (!adjustedResponse.data) {
    return {
      fullText: adjustedResponse.text,
      analysisData: null,
    };
  }

  const json = JSON.stringify(adjustedResponse.data, null, 2);
  const fullText = `${adjustedResponse.text}\n\n___JSON_BLOCK_START___\n${json}\n___JSON_BLOCK_END___`;

  return { fullText, analysisData: adjustedResponse.data };
}

/**
 * 验证JSON一致性
 */
export function validateConsistency(data: AnalysisData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证score与dimensions一致性
  const avgDimensions =
    Object.values(data.dimensions).reduce((sum, val) => sum + val, 0) / 6;
  if (Math.abs(data.score - avgDimensions) > 1) {
    errors.push(
      `score (${data.score}) 与 dimensions平均值 (${avgDimensions.toFixed(1)}) 差距过大`
    );
  }

  // 验证risk_level与risk维度对应
  const riskDim = data.dimensions.risk;
  const expectedRiskLevel =
    riskDim >= 8
      ? '低风险'
      : riskDim >= 5
      ? '中等风险'
      : riskDim >= 2
      ? '高风险'
      : '致命风险';

  if (
    data.entropy > 50 &&
    !data.risk_level.includes('信息不足') &&
    !data.risk_level.includes(expectedRiskLevel.replace('风险', ''))
  ) {
    errors.push(
      `risk_level (${data.risk_level}) 与 risk维度 (${riskDim}) 不匹配，应为 ${expectedRiskLevel}`
    );
  }

  // 验证禁止0分（除非信息不足）
  if (data.entropy > 30) {
    const zeroScores = Object.entries(data.dimensions).filter(
      ([_key, val]) => val === 0
    );
    if (zeroScores.length > 0) {
      errors.push(
        `信息充足时不应有0分维度: ${zeroScores.map(([k]) => k).join(', ')}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 检查文本中是否包含关键词
 */
export function containsKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

/**
 * 统计字数（中英文）
 */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * 等待函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
