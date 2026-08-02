'use client';

/**
 * @file ChatSidebar.tsx
 * @description 会话侧边栏：新建/切换/重命名/删除会话；另含移动端遮罩与抽屉
 */
import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { useChatStore } from '@/src/stores/chatStore';
import { cn } from '@/src/lib/utils';
import { ChatSessionItem } from './ChatSessionItem';

interface ChatSidebarProps {
  /** 移动端关闭回调：抽屉内操作（新建/选中）后自动收起 */
  onCloseMobile?: () => void;
}

/**
 * 会话侧边栏组件：顶部新建按钮，中部会话列表，底部品牌信息；
 * 重命名/删除交互见 ChatSessionItem。
 */
export function ChatSidebar({ onCloseMobile }: ChatSidebarProps) {
  const sessions = useChatStore((state) => state.sessions);
  // 按最近更新时间倒序展示
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const createSession = useChatStore((state) => state.createSession);
  const setActiveSession = useChatStore((state) => state.setActiveSession);
  const renameSession = useChatStore((state) => state.renameSession);
  const deleteSession = useChatStore((state) => state.deleteSession);

  // 新建会话后，移动端自动收起侧边栏
  const handleCreateSession = () => {
    createSession();
    onCloseMobile?.();
  };

  // 切换会话后，移动端自动收起侧边栏
  const handleSelect = (id: string) => {
    setActiveSession(id);
    onCloseMobile?.();
  };

  // 主题相关：侧边栏使用独立的 sidebar-* 语义化 token，
  // 深浅色模式下保持对比度，避免硬编码 gray-900 导致深色模式失效。
  // 宽度适配：宽度由父容器决定（桌面端父级 w-64 固定宽度；
  // 移动端抽屉容器 w-4/5 + max-w-72），此处用 w-full 填满父容器，
  // 避免百分比宽度作用在 auto 宽度的抽屉容器上产生解析异常。
  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border p-3">
        <button
          type="button"
          onClick={handleCreateSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"
        >
          <Plus className="h-4 w-4" />
          新建会话
        </button>
        {/* 关闭按钮：仅移动端显示（md:hidden），p-2.5 保证触控面积 */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-2 rounded p-2.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
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
            <div className="px-3 py-8 text-center text-sm text-sidebar-muted">
              暂无会话，点击上方按钮创建
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <p className="text-center text-xs text-sidebar-muted">
          AI Chat Assistant
        </p>
      </div>
    </div>
  );
}

/**
 * 移动端侧边栏：半透明遮罩 + 抽屉式侧边栏，点击遮罩或关闭按钮收起
 */
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
          // 抽屉容器自身承担移动端宽度（80% 屏宽，最大 288px），
          // 内部 ChatSidebar 用 w-full 填满，宽度解析不受 auto 父级影响；
          // pl-safe 横向屏刘海位于左侧时让出安全区
          'fixed inset-y-0 left-0 z-50 w-4/5 max-w-72 pl-[env(safe-area-inset-left)] transform transition-transform duration-200 ease-in-out md:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ChatSidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>
    </>
  );
}
