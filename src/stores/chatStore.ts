import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIMessage } from 'ai';
import type { ChatSession } from '@/src/types/chat';
import { generateId, truncateText } from '@/src/lib/utils';

const DEFAULT_TITLE = '新会话';

interface ChatStoreState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isSidebarOpen: boolean;
  hydrated: boolean;
}

interface ChatStoreActions {
  setHydrated: (value: boolean) => void;
  createSession: () => string;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  updateSessionMessages: (id: string, messages: UIMessage[]) => void;
  maybeAutoTitle: (id: string, messages: UIMessage[]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type ChatStore = ChatStoreState & ChatStoreActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isSidebarOpen: true,
      hydrated: false,

      setHydrated: (value) => set({ hydrated: value }),

      createSession: () => {
        const id = generateId();
        const newSession: ChatSession = {
          id,
          title: DEFAULT_TITLE,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      setActiveSession: (id) => {
        const { sessions } = get();
        if (sessions.some((session) => session.id === id)) {
          set({ activeSessionId: id });
        }
      },

      renameSession: (id, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, title: trimmed, updatedAt: Date.now() }
              : session
          ),
        }));
      },

      deleteSession: (id) => {
        set((state) => {
          const remaining = state.sessions.filter((session) => session.id !== id);
          let nextActiveId = state.activeSessionId;

          // If the deleted session was active, or the current active id no longer
          // exists in the remaining sessions, switch to the most recent one.
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

      updateSessionMessages: (id, messages) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, messages, updatedAt: Date.now() }
              : session
          ),
        }));
      },

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
              s.id === id
                ? { ...s, title: truncateText(text, 20), updatedAt: Date.now() }
                : s
            ),
          };
        });
      },

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    }),
    {
      name: 'chat-sessions',
      skipHydration: true,
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        isSidebarOpen: state.isSidebarOpen,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate chat store:', error);
        }
        state?.setHydrated(true);
      },
    }
  )
);

export const selectActiveSession = (state: ChatStore): ChatSession | null => {
  if (!state.activeSessionId) return null;
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
};
