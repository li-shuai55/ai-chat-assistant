'use client';

/**
 * @file ChatInput.tsx
 * @description 消息输入框：Enter 发送、Shift+Enter 换行、高度自适应、生成中可停止
 */
import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ChatInputProps {
  /** 提交回调（已过滤空文本） */
  onSubmit: (text: string) => void;
  /** 是否处于生成中：禁用输入并显示停止按钮 */
  isLoading?: boolean;
  /** 停止生成回调 */
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isLoading,
  onStop,
  placeholder = '输入消息...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 过滤空文本与加载态，提交后清空输入框
  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSubmit(text);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // 输入内容变化时自适应增高，最高 200px，超出后内部滚动
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  // 主题相关：输入区使用 surface / border / input 等语义化 token，
  // 深浅色模式下自动适配背景、边框与文字颜色。
  return (
    <div className="border-t border-border bg-surface p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-surface px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          className="max-h-50 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-foreground outline-none disabled:opacity-60"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            aria-label="停止生成"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
              input.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground/60'
            )}
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        AI 生成内容仅供参考
      </p>
    </div>
  );
}
