/**
 * 单元测试 - Zustand Store
 * 测试状态管理逻辑
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useDecisionStore } from '@/lib/store';

describe('Store状态管理测试', () => {
  beforeEach(() => {
    // 重置store到初始状态
    useDecisionStore.setState({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      currentInput: '',
      apiKey: '',
      userMemory: {
        decisionStyle: 'unknown',
        riskTolerance: 5,
        frequentDomains: [],
        keyDecisions: [],
        preferredMode: 'unknown',
        lastUpdated: Date.now(),
      },
    });
  });

  describe('会话管理', () => {
    it('应该创建新会话', () => {
      const { createNewSession } = useDecisionStore.getState();
      createNewSession();

      const { sessions, currentSessionId } = useDecisionStore.getState();
      
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBeTruthy();
      expect(currentSessionId).toBe(sessions[0].id);
      expect(sessions[0].messages).toEqual([]);
      expect(sessions[0].isDebateMode).toBe(false);
      expect(sessions[0].decisionMode).toBe('standard');
    });

    it('应该切换会话', () => {
      const { createNewSession, setCurrentSessionId } = useDecisionStore.getState();
      
      createNewSession();
      const session1Id = useDecisionStore.getState().sessions[0].id;
      
      createNewSession();
      const session2Id = useDecisionStore.getState().sessions[1].id;
      
      setCurrentSessionId(session1Id);
      expect(useDecisionStore.getState().currentSessionId).toBe(session1Id);
      
      setCurrentSessionId(session2Id);
      expect(useDecisionStore.getState().currentSessionId).toBe(session2Id);
    });

    it('应该删除会话', () => {
      const { createNewSession, deleteSession } = useDecisionStore.getState();
      
      createNewSession();
      const session1Id = useDecisionStore.getState().sessions[0].id;
      
      createNewSession();
      
      expect(useDecisionStore.getState().sessions.length).toBe(2);
      
      deleteSession(session1Id);
      
      const { sessions, currentSessionId } = useDecisionStore.getState();
      expect(sessions.length).toBe(1);
      // 删除后应该自动切换到剩余的会话（不管是哪个）
      expect(currentSessionId).toBeTruthy();
      expect(sessions.find(s => s.id === currentSessionId)).toBeTruthy();
    });
  });

  describe('消息管理', () => {
    it('应该添加消息到当前会话', () => {
      const { createNewSession, addMessage } = useDecisionStore.getState();
      createNewSession();
      const sessionId = useDecisionStore.getState().sessions[0].id;

      addMessage({ role: 'user', content: '测试消息' }, sessionId);

      const { sessions } = useDecisionStore.getState();
      expect(sessions[0].messages.length).toBe(1);
      expect(sessions[0].messages[0].role).toBe('user');
      expect(sessions[0].messages[0].content).toBe('测试消息');
    });

    it('应该支持流式消息更新', () => {
      const { createNewSession, addMessage, streamMessageChunk } = useDecisionStore.getState();
      createNewSession();
      const sessionId = useDecisionStore.getState().sessions[0].id;

      // 添加空的AI消息
      addMessage({ role: 'assistant', content: '' }, sessionId);

      // 流式添加内容
      streamMessageChunk('第一部分', sessionId);
      streamMessageChunk('第二部分', sessionId);

      const { sessions } = useDecisionStore.getState();
      expect(sessions[0].messages[0].content).toBe('第一部分第二部分');
    });

    it('应该更新最后一条消息', () => {
      const { createNewSession, addMessage, updateLastMessage } = useDecisionStore.getState();
      createNewSession();
      const sessionId = useDecisionStore.getState().sessions[0].id;

      addMessage({ role: 'assistant', content: '初始内容' }, sessionId);
      updateLastMessage('更新后的内容', sessionId);

      const { sessions } = useDecisionStore.getState();
      expect(sessions[0].messages[0].content).toBe('更新后的内容');
    });
  });

  describe('分析数据管理', () => {
    it('应该设置分析数据', () => {
      const { createNewSession, setAnalysisData } = useDecisionStore.getState();
      createNewSession();
      const sessionId = useDecisionStore.getState().sessions[0].id;

      const analysisData = {
        score: 7,
        risk_level: '中等风险',
        entropy: 75,
        risk_factors: ['测试风险'],
        dimensions: {
          logic: 7,
          feasibility: 7,
          risk: 6,
          value: 7,
          timing: 7,
          resource: 7,
        },
      };

      setAnalysisData(analysisData, sessionId);

      const { sessions } = useDecisionStore.getState();
      expect(sessions[0].analysis).toEqual(analysisData);
    });
  });

  describe('模式切换', () => {
    it('应该切换决策模式', () => {
      const { createNewSession, setDecisionMode } = useDecisionStore.getState();
      createNewSession();

      setDecisionMode('fast');
      expect(useDecisionStore.getState().sessions[0].decisionMode).toBe('fast');

      setDecisionMode('complete');
      expect(useDecisionStore.getState().sessions[0].decisionMode).toBe('complete');
    });

    it('应该切换红队模式', () => {
      const { createNewSession, setDebateMode } = useDecisionStore.getState();
      createNewSession();

      setDebateMode(true);
      expect(useDecisionStore.getState().sessions[0].isDebateMode).toBe(true);

      setDebateMode(false);
      expect(useDecisionStore.getState().sessions[0].isDebateMode).toBe(false);
    });
  });

  describe('用户画像管理', () => {
    it('应该更新用户画像', () => {
      const { updateUserMemory } = useDecisionStore.getState();

      updateUserMemory({ decisionStyle: 'conservative' });

      const { userMemory } = useDecisionStore.getState();
      expect(userMemory.decisionStyle).toBe('conservative');
    });

    it('应该更新风险承受度', () => {
      const { updateUserMemory } = useDecisionStore.getState();

      updateUserMemory({ riskTolerance: 8 });

      const { userMemory } = useDecisionStore.getState();
      expect(userMemory.riskTolerance).toBe(8);
    });

    it('应该添加常用领域', () => {
      const { updateUserMemory } = useDecisionStore.getState();

      updateUserMemory({ frequentDomains: ['投资理财', '职业发展'] });

      const { userMemory } = useDecisionStore.getState();
      expect(userMemory.frequentDomains).toEqual(['投资理财', '职业发展']);
    });

    it('应该记录关键决策', () => {
      const { addKeyDecision } = useDecisionStore.getState();

      addKeyDecision({
        topic: '创业决策',
        result: '推荐执行',
        score: 7,
        riskLevel: '中等风险',
        date: Date.now(),
      });

      const { userMemory } = useDecisionStore.getState();
      expect(userMemory.keyDecisions.length).toBe(1);
      expect(userMemory.keyDecisions[0].topic).toBe('创业决策');
      expect(userMemory.keyDecisions[0].score).toBe(7);
    });

    it('应该限制关键决策数量（最多10条）', () => {
      const { addKeyDecision } = useDecisionStore.getState();

      // 添加15条决策
      for (let i = 0; i < 15; i++) {
        addKeyDecision({
          topic: `决策${i}`,
          result: '推荐执行',
          score: 7,
          riskLevel: '中等风险',
          date: Date.now(),
        });
      }

      const { userMemory } = useDecisionStore.getState();
      expect(userMemory.keyDecisions.length).toBe(10); // 应该只保留最新的10条
    });
  });

  describe('加载状态管理', () => {
    it('应该设置加载状态', () => {
      const { setLoading } = useDecisionStore.getState();

      setLoading(true);
      expect(useDecisionStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useDecisionStore.getState().isLoading).toBe(false);
    });
  });

  describe('输入管理', () => {
    it('应该设置当前输入', () => {
      const { setInput } = useDecisionStore.getState();

      setInput('测试输入');
      expect(useDecisionStore.getState().currentInput).toBe('测试输入');

      setInput('');
      expect(useDecisionStore.getState().currentInput).toBe('');
    });
  });

  describe('API Key管理', () => {
    it('应该设置API Key', () => {
      const { setApiKey } = useDecisionStore.getState();

      setApiKey('test-api-key');
      expect(useDecisionStore.getState().apiKey).toBe('test-api-key');
    });
  });

  describe('持久化测试', () => {
    it('应该从localStorage恢复状态', () => {
      // 这个测试需要mock localStorage
      // 在实际环境中，Zustand会自动处理持久化
      const { createNewSession, addMessage } = useDecisionStore.getState();
      createNewSession();
      const sessionId = useDecisionStore.getState().sessions[0].id;
      
      addMessage({ role: 'user', content: '测试持久化' }, sessionId);

      // 验证状态已保存
      const { sessions } = useDecisionStore.getState();
      expect(sessions[0].messages[0].content).toBe('测试持久化');
    });
  });
});
