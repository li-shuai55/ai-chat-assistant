'use client';

/**
 * @file ChatSessionItem.tsx
 * @description 侧边栏单条会话项：点击切换、悬浮显示重命名/删除，支持内联编辑
 */
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ChatSession } from '@/src/types/chat';
import { cn, formatTimestamp } from '@/src/lib/utils';

interface ChatSessionItemProps {
  /** 会话数据 */
  session: ChatSession;
  /** 是否为当前活跃会话 */
  isActive: boolean;
  onSelect: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

/**
 * 会话列表项组件：默认态显示标题与时间，点击选中；编辑态为内联输入框
 */
export function ChatSessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ChatSessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑态时聚焦并全选标题，便于直接重命名
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // 重命名：空文本则还原原标题
  const handleRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRename(session.id, trimmed);
    } else {
      setEditTitle(session.title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(session.title);
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRename();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  // 删除前二次确认，避免误删
  const handleDelete = () => {
    if (window.confirm(`确定要删除会话“${session.title}”吗？`)) {
      onDelete(session.id);
    }
  };

  if (isEditing) {
    return (
      <div className="group flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-3 py-2">
        <MessageSquare className="h-4 w-4 shrink-0 text-sidebar-muted" />
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-foreground outline-none"
        />
        <button
          type="button"
          onClick={handleRename}
          className="shrink-0 rounded p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // 主题相关：使用 sidebar-* 语义化 token，随主题切换自动适配深浅色
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-sidebar-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="text-xs text-sidebar-muted/80">{formatTimestamp(session.updatedAt)}</p>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-1',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setEditTitle(session.title);
            setIsEditing(true);
          }}
          className="rounded p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="重命名"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-1 text-sidebar-muted hover:bg-error-bg hover:text-error-text"
          aria-label="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
