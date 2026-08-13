/**
 * @file chatStore.ts
 * @description 会话全局状态：会话 CRUD、活跃会话切换、localStorage 持久化
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIMessage } from 'ai';
import type { ChatSession, ModelConfig, PromptTemplate } from '@/src/types/chat';
import { generateId, truncateText } from '@/src/lib/utils';

/** 新建会话的默认标题；maybeAutoTitle 据此判断是否需要自动命名 */
const DEFAULT_TITLE = '新会话';

/** 新建会话的默认模型与生成参数配置 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'bailian',
  model: 'qwen-plus',
  temperature: 0.7,
  maxOutputTokens: 2048,
  systemPrompt: '',
};

/** 内置 Prompt 模板，首次使用或重置时提供默认选项 */
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default-general',
    name: '通用助手',
    systemPrompt: '你是一个 helpful assistant，请用简洁清晰的中文回答用户问题。',
  },
  {
    id: 'default-coder',
    name: '代码助手',
    systemPrompt:
      '你是一位资深软件工程师，擅长代码解释、调试与重构。回答时请优先给出可运行的代码片段，并简要说明关键逻辑。',
  },
  {
    id: 'default-translator',
    name: '翻译助手',
    systemPrompt:
      '你是一名专业翻译。请将用户输入的内容翻译成自然、地道的中文，保留原始格式与专有名词，不添加额外解释。',
  },
  {
    id: 'default-meeting',
    name: '会议纪要',
    systemPrompt:
      '你是一名会议助理。请将用户提供的会议内容整理为结构化的会议纪要，包含：议题、关键结论、待办事项（负责人/截止时间）。',
  },
];

/** 会话全局状态：会话列表、当前活跃会话、侧边栏开关、Prompt 模板与持久化水合标记 */
interface ChatStoreState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isSidebarOpen: boolean;
  hydrated: boolean;
  /** Prompt 模板列表，前端本地管理 */
  promptTemplates: PromptTemplate[];
}

/** 会话操作：创建/切换/重命名/删除/更新消息/自动命名/侧边栏控制/Prompt 模板管理 */
interface ChatStoreActions {
  setHydrated: (value: boolean) => void;
  createSession: () => string;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  updateSessionMessages: (id: string, messages: UIMessage[]) => void;
  updateSessionModelConfig: (id: string, config: Partial<ModelConfig>) => void;
  maybeAutoTitle: (id: string, messages: UIMessage[]) => void;
  touchSession: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  /** 添加 Prompt 模板 */
  addPromptTemplate: (template: Omit<PromptTemplate, 'id'>) => void;
  /** 更新 Prompt 模板 */
  updatePromptTemplate: (id: string, updates: Partial<Omit<PromptTemplate, 'id'>>) => void;
  /** 删除 Prompt 模板；删除的是内置模板时自动过滤 */
  deletePromptTemplate: (id: string) => void;
  /** 将指定模板应用到指定会话 */
  applyPromptTemplate: (sessionId: string, templateId: string) => void;
}

type ChatStore = ChatStoreState & ChatStoreActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isSidebarOpen: true,
      hydrated: false,
      // 首次加载时使用内置默认模板；后续由 persist 从 localStorage 覆盖
      promptTemplates: DEFAULT_PROMPT_TEMPLATES,

      setHydrated: (value) => set({ hydrated: value }),

      /** 创建新会话并设为活跃，返回新会话 id */
      createSession: () => {
        const id = generateId();
        const newSession: ChatSession = {
          id,
          title: DEFAULT_TITLE,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          // 新会话继承默认模型与生成参数配置
          modelConfig: { ...DEFAULT_MODEL_CONFIG },
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      /** 切换活跃会话（仅当 id 存在时生效） */
      setActiveSession: (id) => {
        const { sessions } = get();
        if (sessions.some((session) => session.id === id)) {
          set({ activeSessionId: id });
        }
      },

      /** 重命名会话：空标题忽略 */
      renameSession: (id, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, title: trimmed } : session
          ),
        }));
      },

      /** 删除会话；若删除的是活跃会话，自动切换到最近更新的会话 */
      deleteSession: (id) => {
        set((state) => {
          const remaining = state.sessions.filter((session) => session.id !== id);
          let nextActiveId = state.activeSessionId;

          // 删除的是活跃会话，或当前活跃 id 已失效时，回退到最近更新的会话
          if (
            state.activeSessionId === id ||
            !remaining.some((session) => session.id === state.activeSessionId)
          ) {
            const sorted = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
            nextActiveId = sorted[0]?.id ?? null;
          }

          return {
            sessions: remaining,
            activeSessionId: nextActiveId,
          };
        });
      },

      /** 写入会话消息（不更新 updatedAt，排序由 touchSession 控制） */
      updateSessionMessages: (id, messages) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, messages } : session
          ),
        }));
      },

      /** 更新会话的模型与生成参数配置（部分更新，未提供字段保持原值） */
      updateSessionModelConfig: (id, config) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, modelConfig: { ...session.modelConfig, ...config } }
              : session
          ),
        }));
      },

      /** 刷新会话 updatedAt：用户发送新问题时调用，使其排到列表顶部 */
      touchSession: (id) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, updatedAt: Date.now() } : session
          ),
        }));
      },

      /** 自动命名：仅当会话仍是默认标题时，取首条用户消息前 20 字作为标题 */
      maybeAutoTitle: (id, messages) => {
        set((state) => {
          const session = state.sessions.find((s) => s.id === id);
          if (!session || session.title !== DEFAULT_TITLE) {
            return state;
          }

          const firstUserMessage = messages.find((m) => m.role === 'user');
          if (!firstUserMessage) return state;

          const text = firstUserMessage.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('')
            .trim();

          if (!text) return state;

          return {
            sessions: state.sessions.map((s) =>
              s.id === id ? { ...s, title: truncateText(text, 20) } : s
            ),
          };
        });
      },

      /** 切换侧边栏开关 */
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      /** 显式设置侧边栏开关（移动端遮罩/抽屉使用） */
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      /** 添加 Prompt 模板 */
      addPromptTemplate: (template) => {
        const newTemplate: PromptTemplate = { ...template, id: generateId() };
        set((state) => ({
          promptTemplates: [newTemplate, ...state.promptTemplates],
        }));
      },

      /** 更新 Prompt 模板 */
      updatePromptTemplate: (id, updates) => {
        set((state) => ({
          promptTemplates: state.promptTemplates.map((template) =>
            template.id === id ? { ...template, ...updates } : template
          ),
        }));
      },

      /** 删除 Prompt 模板 */
      deletePromptTemplate: (id) => {
        set((state) => ({
          promptTemplates: state.promptTemplates.filter((template) => template.id !== id),
        }));
      },

      /** 将指定模板应用到指定会话 */
      applyPromptTemplate: (sessionId, templateId) => {
        const { promptTemplates, sessions } = get();
        const template = promptTemplates.find((t) => t.id === templateId);
        if (!template) return;

        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const changes: Partial<ModelConfig> = {
          systemPrompt: template.systemPrompt,
        };

        // 模板中显式提供的模型/参数才覆盖当前会话配置
        if (template.provider !== undefined) changes.provider = template.provider;
        if (template.model !== undefined) changes.model = template.model;
        if (template.temperature !== undefined) changes.temperature = template.temperature;
        if (template.maxOutputTokens !== undefined) changes.maxOutputTokens = template.maxOutputTokens;

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, modelConfig: { ...s.modelConfig, ...changes } } : s
          ),
        }));
      },
    }),
    {
      name: 'chat-sessions',
      // 跳过自动水合，由首页手动触发，避免水合前闪烁
      skipHydration: true,
      // 只持久化业务数据，hydrated 等瞬时状态不入库
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        isSidebarOpen: state.isSidebarOpen,
        promptTemplates: state.promptTemplates,
      }),
      // 合并且迁移旧数据：早期没有 modelConfig 或缺少新增字段的会话，
      // 用 DEFAULT_MODEL_CONFIG 兜底后再覆盖旧值，确保新增字段（如 systemPrompt）自动补上。
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as Partial<ChatStoreState> | undefined;
        const mergedSessions =
          persisted?.sessions?.map((session) => ({
            ...session,
            modelConfig: { ...DEFAULT_MODEL_CONFIG, ...session.modelConfig },
          })) ?? currentState.sessions;

        return {
          ...currentState,
          ...persisted,
          sessions: mergedSessions,
          // 旧数据没有 promptTemplates 时，使用内置默认模板兜底
          promptTemplates: persisted?.promptTemplates ?? currentState.promptTemplates,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate chat store:', error);
        }
        state?.setHydrated(true);
      },
    }
  )
);

/** 选择器：返回当前活跃会话，无活跃会话时返回 null */
export const selectActiveSession = (state: ChatStore): ChatSession | null => {
  if (!state.activeSessionId) return null;
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
};
