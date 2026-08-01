'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ChatSession } from '@/src/types/chat';
import { cn, formatTimestamp } from '@/src/lib/utils';

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

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

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

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

  const handleDelete = () => {
    if (window.confirm(`确定要删除会话“${session.title}”吗？`)) {
      onDelete(session.id);
    }
  };

  if (isEditing) {
    return (
      <div className="group flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2">
        <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-100 outline-none"
        />
        <button
          type="button"
          onClick={handleRename}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors',
        isActive
          ? 'bg-gray-800 text-gray-100'
          : 'text-gray-300 hover:bg-gray-800/50 hover:text-gray-100'
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="text-xs text-gray-500">{formatTimestamp(session.updatedAt)}</p>
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
          className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          aria-label="重命名"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-1 text-gray-400 hover:bg-red-900/50 hover:text-red-400"
          aria-label="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
