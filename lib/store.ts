import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// 用户记忆 - 跨会话持久化的用户画像
export interface UserMemory {
    // 决策风格偏好
    decisionStyle: 'conservative' | 'neutral' | 'aggressive' | 'unknown';
    // 风险承受度 (1-10)
    riskTolerance: number;
    // 常见决策领域
    frequentDomains: string[];
    // 历史决策摘要 (最多保留10条)
    keyDecisions: Array<{
        topic: string;       // 决策主题
        result: string;      // 最终建议 (做/不做/待定)
        score: number;       // 综合评分
        riskLevel: string;   // 风险等级
        date: number;        // 时间戳
    }>;
    // 用户偏好的分析深度
    preferredMode: 'fast' | 'standard' | 'complete' | 'unknown';
    // 最后更新时间
    lastUpdated: number;
}

interface AnalysisState {
    score: number;
    risk_level: string;
    entropy: number;
    risk_factors: string[];
    // 多维度评分 (0-10)
    dimensions: {
        logic: number;      // 逻辑严密度
        feasibility: number; // 可行性
        risk: number;       // 风险控制
        value: number;      // 价值匹配度
        timing: number;     // 时机适当性
        resource: number;   // 资源充足度
    };
    // 新增字段
    decision_type?: string;  // 决策类型
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

interface Session {
    id: string;
    title: string;
    messages: Message[];
    analysis: AnalysisState;
    entropyProgress: number;
    isDebateMode: boolean;
    decisionMode: 'fast' | 'standard' | 'complete';
    createdAt: number;
    // 复盘相关
    reviewReminder?: number;  // 复盘提醒时间戳
    reviewResult?: {
        actualResult: string;    // 实际发生了什么
        wasCorrect: boolean;     // 当初判断是否正确
        lessons: string;         // 经验教训
        completedAt: number;     // 复盘完成时间
    };
}

interface DecisionStore {
    sessions: Session[];
    currentSessionId: string | null;
    isLoading: boolean;
    currentInput: string;
    sidebarCollapsed: boolean;
    mobileMenuOpen: boolean;
    mobilePanelOpen: boolean;

    // Settings & Auth
    apiKey: string;
    showSettings: boolean;

    // First time user
    hasSeenGuide: boolean;
    setHasSeenGuide: (seen: boolean) => void;

    // User Memory - 跨会话记忆
    userMemory: UserMemory;

    // Session Actions
    setCurrentSessionId: (id: string | null) => void;
    createNewSession: (title?: string) => void;
    deleteSession: (id: string) => void;
    renameSession: (id: string, title: string) => void;

    // Message & Analysis Actions (scoped to current session)
    addMessage: (msg: Message, sessionId?: string) => void;
    streamMessageChunk: (chunk: string, sessionId?: string) => void;
    updateLastMessage: (content: string, sessionId?: string) => void;
    setAnalysisData: (data: Partial<AnalysisState>, sessionId?: string) => void;
    setEntropyProgress: (progress: number) => void;
    setDebateMode: (enabled: boolean) => void;
    setDecisionMode: (mode: 'fast' | 'standard' | 'complete') => void;

    // Review Actions
    setReviewReminder: (sessionId: string, reminderTime: number) => void;
    setReviewResult: (sessionId: string, result: { actualResult: string; wasCorrect: boolean; lessons: string }) => void;
    getSessionsWithPendingReviews: () => Session[];

    // User Memory Actions
    updateUserMemory: (data: Partial<UserMemory>) => void;
    addKeyDecision: (decision: UserMemory['keyDecisions'][0]) => void;
    clearUserMemory: () => void;

    // Global Actions
    setLoading: (loading: boolean) => void;
    setInput: (text: string) => void;
    resetChat: () => void;
    setApiKey: (key: string) => void;
    toggleSettings: (show?: boolean) => void;
    toggleSidebar: () => void;
    toggleMobileMenu: (open?: boolean) => void;
    toggleMobilePanel: (open?: boolean) => void;
    clearAllData: () => void;
}

// 默认用户记忆
const defaultUserMemory: UserMemory = {
    decisionStyle: 'unknown',
    riskTolerance: 5,
    frequentDomains: [],
    keyDecisions: [],
    preferredMode: 'unknown',
    lastUpdated: Date.now(),
};

export const useDecisionStore = create<DecisionStore>()(
    persist(
        (set, get) => ({
            sessions: [],
            currentSessionId: null,
            isLoading: false,
            currentInput: '',
            sidebarCollapsed: false,
            mobileMenuOpen: false,
            mobilePanelOpen: false,
            apiKey: '',
            showSettings: false,
            hasSeenGuide: false,
            userMemory: defaultUserMemory,

            setHasSeenGuide: (seen) => set({ hasSeenGuide: seen }),

            setCurrentSessionId: (id) => set({ currentSessionId: id }),

            createNewSession: (title = '新决策') => {
                const newId = crypto.randomUUID();
                const newSession: Session = {
                    id: newId,
                    title,
                    messages: [], // 空消息列表，不预置欢迎语
                    analysis: {
                        score: 0,
                        risk_level: "待评估",
                        entropy: 0,
                        risk_factors: [],
                        dimensions: {
                            logic: 0,
                            feasibility: 0,
                            risk: 0,
                            value: 0,
                            timing: 0,
                            resource: 0
                        }
                    },
                    entropyProgress: 0,
                    isDebateMode: false,
                    decisionMode: 'standard',
                    createdAt: Date.now(),
                    reviewReminder: undefined,
                    reviewResult: undefined
                };
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    currentSessionId: newId
                }));
            },

            setReviewReminder: (sessionId, reminderTime) => set((state) => ({
                sessions: state.sessions.map(s => 
                    s.id === sessionId ? { ...s, reviewReminder: reminderTime } : s
                )
            })),

            setReviewResult: (sessionId, result) => set((state) => ({
                sessions: state.sessions.map(s => 
                    s.id === sessionId ? { 
                        ...s, 
                        reviewResult: {
                            ...result,
                            completedAt: Date.now()
                        }
                    } : s
                )
            })),

            getSessionsWithPendingReviews: () => {
                const state = get();
                const now = Date.now();
                return state.sessions.filter(s => 
                    s.reviewReminder && 
                    s.reviewReminder <= now && 
                    !s.reviewResult
                );
            },

            deleteSession: (id) => set((state) => {
                const newSessions = state.sessions.filter(s => s.id !== id);
                let newId = state.currentSessionId;
                if (state.currentSessionId === id) {
                    newId = newSessions.length > 0 ? newSessions[0].id : null;
                }
                return {
                    sessions: newSessions,
                    currentSessionId: newId
                };
            }),

            renameSession: (id, title) => set((state) => ({
                sessions: state.sessions.map(s => s.id === id ? { ...s, title } : s)
            })),

            addMessage: (msg, sessionId) => set((state) => {
                const targetSessionId = sessionId ?? state.currentSessionId;
                const currentSession = state.sessions.find(s => s.id === targetSessionId);
                if (!currentSession) return state;

                // Auto-rename: if this is the first user message and title is default
                let newTitle = currentSession.title;
                if (msg.role === 'user' && currentSession.messages.filter(m => m.role === 'user').length === 0) {
                    // Extract first 20 chars as title
                    const titleText = msg.content.trim().slice(0, 20);
                    newTitle = titleText + (msg.content.length > 20 ? '...' : '');
                }

                return {
                    sessions: state.sessions.map(s =>
                        s.id === targetSessionId
                            ? { ...s, messages: [...s.messages, msg], title: newTitle }
                            : s
                    )
                };
            }),

            streamMessageChunk: (chunk, sessionId) => set((state) => {
                const targetSessionId = sessionId ?? state.currentSessionId;
                const currentSession = state.sessions.find(s => s.id === targetSessionId);
                if (!currentSession) return state;

                const msgs = [...currentSession.messages];
                const lastMsg = msgs[msgs.length - 1];

                let newMsgs: Message[];
                if (lastMsg && lastMsg.role === 'assistant') {
                    newMsgs = msgs.map((m, i) =>
                        i === msgs.length - 1 ? { ...m, content: m.content + chunk } : m
                    );
                } else {
                    newMsgs = [...msgs, { role: 'assistant', content: chunk }];
                }

                return {
                    sessions: state.sessions.map(s =>
                        s.id === targetSessionId ? { ...s, messages: newMsgs } : s
                    )
                };
            }),

            updateLastMessage: (content, sessionId) => set((state) => {
                const targetSessionId = sessionId ?? state.currentSessionId;
                const currentSession = state.sessions.find(s => s.id === targetSessionId);
                if (!currentSession) return state;
                return {
                    sessions: state.sessions.map(s =>
                        s.id === targetSessionId
                            ? {
                                ...s,
                                messages: s.messages.map((m, i) =>
                                    i === s.messages.length - 1 ? { ...m, content } : m
                                )
                            }
                            : s
                    )
                };
            }),

            setAnalysisData: (data, sessionId) => set((state) => {
                const targetSessionId = sessionId ?? state.currentSessionId;
                const currentSession = state.sessions.find(s => s.id === targetSessionId);
                if (!currentSession) return state;
                return {
                    sessions: state.sessions.map(s =>
                        s.id === targetSessionId
                            ? { ...s, analysis: { ...s.analysis, ...data }, entropyProgress: data.entropy ?? s.entropyProgress }
                            : s
                    )
                };
            }),

            setEntropyProgress: (progress) => set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.currentSessionId ? { ...s, entropyProgress: progress } : s
                )
            })),

            setDebateMode: (enabled) => set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.currentSessionId ? { ...s, isDebateMode: enabled } : s
                )
            })),

            setDecisionMode: (mode) => set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.currentSessionId ? { ...s, decisionMode: mode } : s
                )
            })),

            // User Memory Actions
            updateUserMemory: (data) => set((state) => ({
                userMemory: { 
                    ...state.userMemory, 
                    ...data, 
                    lastUpdated: Date.now() 
                }
            })),

            addKeyDecision: (decision) => set((state) => {
                const newDecisions = [decision, ...state.userMemory.keyDecisions].slice(0, 10); // 最多保留10条
                return {
                    userMemory: {
                        ...state.userMemory,
                        keyDecisions: newDecisions,
                        lastUpdated: Date.now(),
                    }
                };
            }),

            clearUserMemory: () => set({ userMemory: defaultUserMemory }),

            setLoading: (loading) => set({ isLoading: loading }),
            setInput: (text) => set({ currentInput: text }),
            resetChat: () => {
                const { createNewSession } = get();
                createNewSession();
            },

            setApiKey: (key) => set({ apiKey: key }),
            toggleSettings: (show) => set((state) => ({ showSettings: show ?? !state.showSettings })),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            toggleMobileMenu: (open) => set((state) => ({ mobileMenuOpen: open ?? !state.mobileMenuOpen })),
            toggleMobilePanel: (open) => set((state) => ({ mobilePanelOpen: open ?? !state.mobilePanelOpen })),
            clearAllData: () => {
                localStorage.removeItem('decision-ai-storage');
                window.location.reload();
            },
        }),
        {
            name: 'decision-ai-storage',
            version: 1, // Upgrade to version 1
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                sessions: state.sessions,
                currentSessionId: state.currentSessionId,
                apiKey: state.apiKey,
                userMemory: state.userMemory,
                hasSeenGuide: state.hasSeenGuide,
            }),
            migrate: (persistedState: unknown, version: number) => {
                if (version === 0) {
                    const oldState = (persistedState && typeof persistedState === 'object')
                        ? (persistedState as Record<string, unknown>)
                        : {};

                    const migratedMessages = Array.isArray(oldState.messages)
                        ? (oldState.messages as Message[])
                        : [];

                    const migratedAnalysis = (oldState.analysis && typeof oldState.analysis === 'object')
                        ? (oldState.analysis as AnalysisState)
                        : { 
                            score: 0, 
                            risk_level: "待评估", 
                            entropy: 0, 
                            risk_factors: [],
                            dimensions: { logic: 0, feasibility: 0, risk: 0, value: 0, timing: 0, resource: 0 }
                        };

                    const migratedEntropyProgress = typeof oldState.entropyProgress === 'number' ? oldState.entropyProgress : 0;
                    const migratedIsDebateMode = typeof oldState.isDebateMode === 'boolean' ? oldState.isDebateMode : false;

                    const initialSession: Session = {
                        id: 'default-session',
                        title: '历史会话',
                        messages: migratedMessages,
                        analysis: migratedAnalysis,
                        entropyProgress: migratedEntropyProgress,
                        isDebateMode: migratedIsDebateMode,
                        decisionMode: 'standard',
                        createdAt: Date.now()
                    };
                    return {
                        ...oldState,
                        sessions: [initialSession],
                        currentSessionId: 'default-session',
                    };
                }
                return persistedState;
            },
            onRehydrateStorage: () => {
                // Ensure at least one session exists if it's empty after rehydration
                return (rehydratedState) => {
                    if (rehydratedState && rehydratedState.sessions.length === 0) {
                        rehydratedState.createNewSession('首个决策');
                    }
                };
            },
        }
    )
);
