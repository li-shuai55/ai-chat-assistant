'use client';

import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { useChatStore } from '@/src/stores/chatStore';
import { cn } from '@/src/lib/utils';
import { ChatSessionItem } from './ChatSessionItem';

interface ChatSidebarProps {
  onCloseMobile?: () => void;
}

export function ChatSidebar({ onCloseMobile }: ChatSidebarProps) {
  const sessions = useChatStore((state) => state.sessions);
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const createSession = useChatStore((state) => state.createSession);
  const setActiveSession = useChatStore((state) => state.setActiveSession);
  const renameSession = useChatStore((state) => state.renameSession);
  const deleteSession = useChatStore((state) => state.deleteSession);

  const handleCreateSession = () => {
    createSession();
    onCloseMobile?.();
  };

  const handleSelect = (id: string) => {
    setActiveSession(id);
    onCloseMobile?.();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-800 bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-3">
        <button
          type="button"
          onClick={handleCreateSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-2 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-700"
        >
          <Plus className="h-4 w-4" />
          新建会话
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-2 rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100 md:hidden"
          aria-label="关闭侧边栏"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {sortedSessions.map((session) => (
            <ChatSessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => handleSelect(session.id)}
              onRename={renameSession}
              onDelete={deleteSession}
            />
          ))}

          {sortedSessions.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              暂无会话，点击上方按钮创建
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        <p className="text-center text-xs text-gray-500">
          AI Chat Assistant
        </p>
      </div>
    </div>
  );
}

export function ChatSidebarOverlay() {
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ChatSidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>
    </>
  );
}
