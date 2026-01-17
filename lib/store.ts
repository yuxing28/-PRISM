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

    // User Memory - 跨会话记忆
    userMemory: UserMemory;

    // Session Actions
    setCurrentSessionId: (id: string | null) => void;
    createNewSession: (title?: string) => void;
    deleteSession: (id: string) => void;
    renameSession: (id: string, title: string) => void;

    // Message & Analysis Actions (scoped to current session)
    addMessage: (msg: Message) => void;
    streamMessageChunk: (chunk: string) => void;
    updateLastMessage: (content: string) => void;
    setAnalysisData: (data: Partial<AnalysisState>) => void;
    setEntropyProgress: (progress: number) => void;
    setDebateMode: (enabled: boolean) => void;
    setDecisionMode: (mode: 'fast' | 'standard' | 'complete') => void;

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
            userMemory: defaultUserMemory,

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
                    createdAt: Date.now()
                };
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    currentSessionId: newId
                }));
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

            addMessage: (msg) => set((state) => {
                const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
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
                        s.id === state.currentSessionId
                            ? { ...s, messages: [...s.messages, msg], title: newTitle }
                            : s
                    )
                };
            }),

            streamMessageChunk: (chunk) => set((state) => {
                const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
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
                        s.id === state.currentSessionId ? { ...s, messages: newMsgs } : s
                    )
                };
            }),

            updateLastMessage: (content) => set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.currentSessionId
                        ? {
                            ...s,
                            messages: s.messages.map((m, i) =>
                                i === s.messages.length - 1 ? { ...m, content } : m
                            )
                        }
                        : s
                )
            })),

            setAnalysisData: (data) => set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.currentSessionId
                        ? { ...s, analysis: { ...s.analysis, ...data }, entropyProgress: data.entropy ?? s.entropyProgress }
                        : s
                )
            })),

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
            }),
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    // Migration from v0 (Single Session) to v1 (Multi-Session)
                    const oldState = persistedState as any;
                    const initialSession: Session = {
                        id: 'default-session',
                        title: '历史会话',
                        messages: oldState.messages || [],
                        analysis: oldState.analysis || { 
                            score: 0, 
                            risk_level: "待评估", 
                            entropy: 0, 
                            risk_factors: [],
                            dimensions: { logic: 0, feasibility: 0, risk: 0, value: 0, timing: 0, resource: 0 }
                        },
                        entropyProgress: oldState.entropyProgress || 0,
                        isDebateMode: oldState.isDebateMode || false,
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
