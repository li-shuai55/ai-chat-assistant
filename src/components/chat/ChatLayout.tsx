'use client';

/**
 * @file ChatLayout.tsx
 * @description 应用布局中枢：桌面端侧边栏 + 移动端抽屉遮罩 + 主聊天区
 */
import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useChatStore, selectActiveSession } from '@/src/stores/chatStore';
import { cn } from '@/src/lib/utils';
import { ChatSidebar, ChatSidebarOverlay } from './ChatSidebar';
import { ChatArea } from './ChatArea';

export function ChatLayout() {
  // 传输层全局只创建一次；useChat 通过它 POST /api/chat 进行流式请求
  const transport = useMemo(
    () => new DefaultChatTransport<UIMessage>({ api: '/api/chat' }),
    []
  );

  const sessions = useChatStore((state) => state.sessions);
  const activeSession = useChatStore(selectActiveSession);
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const createSession = useChatStore((state) => state.createSession);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div
        className={cn(
          'hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out md:block',
          isSidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <ChatSidebar />
      </div>

      {/* Mobile overlay and drawer */}
      <ChatSidebarOverlay />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-hidden">
          {sessions.length === 0 ? (
            // 无会话时的空态引导
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-gray-500">
              <p className="text-lg font-medium">还没有会话</p>
              <p className="mt-2 text-sm">点击新建会话，开始与 AI 对话</p>
              <button
                type="button"
                onClick={createSession}
                className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                新建会话
              </button>
            </div>
          ) : activeSession ? (
            // key 随活跃会话变化强制重建 ChatArea，保证 useChat 与会话重新绑定、互不串场
            <ChatArea
              key={activeSessionId}
              session={activeSession}
              transport={transport}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              加载中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
