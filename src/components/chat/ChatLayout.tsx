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
import { ThemeToggle } from '@/src/components/theme/ThemeToggle';
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

  // 主题相关：颜色统一使用语义化 token（bg-background 等），
  // 由 <html data-theme> 驱动 CSS 变量，切换主题无需改动任何组件代码。
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 主题切换按钮：固定于视口右上角，保证在任意状态下（无会话空态/加载态/聊天态）都可访问 */}
      <div className="fixed right-4 top-4 z-30">
        <ThemeToggle />
      </div>
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
            <div className="flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
              <p className="text-lg font-medium">还没有会话</p>
              <p className="mt-2 text-sm">点击新建会话，开始与 AI 对话</p>
              <button
                type="button"
                onClick={createSession}
                className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
            <div className="flex h-full items-center justify-center text-muted-foreground">
              加载中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
