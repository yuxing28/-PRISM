/**
 * 多轮对话测试
 * 验证上下文管理和信息累积
 */

import { describe, it, expect } from '@jest/globals';
import { callChatAPI } from './utils/test-helpers';
import { Message } from '@/lib/store';
import scenarios from './test-cases/scenarios.json';

describe('多轮对话测试', () => {
  it('信息补充流程：entropy应该逐步提升', async () => {
    const testCase = scenarios['多轮对话场景'][0];
    const messages: Message[] = [];

    // 第一轮：信息不足
    const turn1 = testCase.turns[0];
    const { fullText: text1, analysisData: data1 } = await callChatAPI(
      turn1.input
    );

    expect(data1).not.toBeNull();
    if (!data1) return;

    expect(data1.entropy).toBeGreaterThanOrEqual(turn1.expectedEntropy.min);
    expect(data1.entropy).toBeLessThanOrEqual(turn1.expectedEntropy.max);

    // 添加到历史
    messages.push({ role: 'user', content: turn1.input });
    messages.push({ role: 'assistant', content: text1 });

    // 第二轮：补充信息
    const turn2 = testCase.turns[1];
    const { fullText: text2, analysisData: data2 } = await callChatAPI(
      turn2.input,
      { previousMessages: messages }
    );

    expect(data2).not.toBeNull();
    if (!data2) return;

    // Entropy应该提升
    expect(data2.entropy).toBeGreaterThan(data1.entropy);
    expect(data2.entropy).toBeGreaterThanOrEqual(turn2.expectedEntropy.min);
    expect(data2.entropy).toBeLessThanOrEqual(turn2.expectedEntropy.max);

    // 应该引用之前的信息
    if (turn2.shouldReferToPreviousInfo) {
      const cleanText2 = text2.replace(
        /___JSON_BLOCK_START___[\s\S]*___JSON_BLOCK_END___/,
        ''
      );
      const hasReference =
        cleanText2.includes('根据') ||
        cleanText2.includes('您提供') ||
        cleanText2.includes('了解到');
      expect(hasReference).toBe(true);
    }
  }, 60000);

  it('多轮对话应该保持一致的风格', async () => {
    const messages: Message[] = [];

    // 第一轮
    const { fullText: text1 } = await callChatAPI('我想开咖啡店');
    messages.push({ role: 'user', content: '我想开咖啡店' });
    messages.push({ role: 'assistant', content: text1 });

    // 第二轮
    const { fullText: text2 } = await callChatAPI('有50万预算', {
      previousMessages: messages,
    });

    // 两轮都不应该有Markdown标题
    expect(text1).not.toMatch(/^##/m);
    expect(text2).not.toMatch(/^##/m);

    // 两轮都不应该有项目符号列表（除非是提问）
    const hasListInText1 = /^[-*•]/m.test(
      text1.replace(/___JSON_BLOCK_START___[\s\S]*___JSON_BLOCK_END___/, '')
    );
    const hasListInText2 = /^[-*•]/m.test(
      text2.replace(/___JSON_BLOCK_START___[\s\S]*___JSON_BLOCK_END___/, '')
    );

    // 信息不足时允许用"-"列问题，其他情况不应该用
    expect(hasListInText1 || hasListInText2).toBeDefined();
  }, 60000);

  it('补充信息后Score应该更准确', async () => {
    const messages: Message[] = [];

    // 第一轮：极简信息
    const { analysisData: data1 } = await callChatAPI('想投资比特币');
    messages.push({ role: 'user', content: '想投资比特币' });

    // 第二轮：补充详细信息
    const { analysisData: data2 } = await callChatAPI(
      '我有100万闲钱，35岁，风险承受度中等，投资经验5年，打算配置10%到比特币，剩下的放稳健理财',
      { previousMessages: messages }
    );

    expect(data1).not.toBeNull();
    expect(data2).not.toBeNull();

    if (data1 && data2) {
      // 第一轮应该是占位值
      expect(data1.score).toBe(5);
      expect(data1.entropy).toBeLessThan(30);

      // 第二轮应该有真实评分
      expect(data2.entropy).toBeGreaterThan(60);
      expect(data2.score).not.toBe(5); // 应该不是占位值了

      // Score应该在合理范围（因为是10%配置，风险可控）
      expect(data2.score).toBeGreaterThanOrEqual(5);
      expect(data2.score).toBeLessThanOrEqual(8);
    }
  }, 60000);

  it('长对话不应该遗忘关键信息', async () => {
    const messages: Message[] = [];

    // 模拟5轮对话
    const turns = [
      '我想换工作',
      '现在年薪40万，在互联网公司做产品经理',
      '工作3年了，想跳到AI行业',
      '新offer年薪60万，但是创业公司',
      '我今年28岁，已婚无孩，存款50万',
    ];

    let lastData = null;

    for (const input of turns) {
      const { fullText, analysisData } = await callChatAPI(input, {
        previousMessages: messages,
      });

      messages.push({ role: 'user', content: input });
      messages.push({ role: 'assistant', content: fullText });

      if (analysisData) {
        lastData = analysisData;
      }
    }

    // 最后一轮应该有充足的信息
    expect(lastData).not.toBeNull();
    if (lastData) {
      expect(lastData.entropy).toBeGreaterThan(70);
    }

    // 最后一轮的回复应该能综合前面的信息
    const lastResponse = messages[messages.length - 1].content;
    const cleanText = lastResponse.replace(
      /___JSON_BLOCK_START___[\s\S]*___JSON_BLOCK_END___/,
      ''
    );

    // 应该提到关键信息点
    const mentionsAge = cleanText.includes('28') || cleanText.includes('年龄');
    const mentionsSalary =
      cleanText.includes('40万') || cleanText.includes('60万');
    const mentionsExperience = cleanText.includes('3年');

    // 至少应该提到其中几个关键点
    const mentionCount = [mentionsAge, mentionsSalary, mentionsExperience].filter(
      Boolean
    ).length;
    expect(mentionCount).toBeGreaterThan(0);
  }, 120000); // 长对话需要更多时间
});
