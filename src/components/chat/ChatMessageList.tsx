'use client';

/**
 * @file ChatMessageList.tsx
 * @description 消息列表：空态引导、流式加载动画、错误提示，新消息自动滚底
 */
import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';
import { ChatError } from './ChatError';

interface ChatMessageListProps {
  messages: UIMessage[];
  error?: Error | null;
  isLoading?: boolean;
  /** 重新生成回调：对最后一条 assistant 消息传入 */
  onRegenerate?: (messageId: string) => void;
  /** 是否处于重新生成中：用于禁用按钮 */
  isRegenerating?: boolean;
  /** 错误重试回调：点击“重试”时触发 */
  onRetry?: () => void;
}

export function ChatMessageList({
  messages,
  error,
  isLoading,
  onRegenerate,
  isRegenerating,
  onRetry,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 消息更新或加载状态变化时，平滑滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 找到最后一条 assistant 消息的 id，仅对该消息展示“重新生成”按钮
  const lastAssistantMessageId =
    [...messages].reverse().find((message) => message.role === 'assistant')?.id ?? null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {messages.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center text-gray-400">
            <p className="text-lg font-medium">输入文字，开始对话</p>
            <p className="mt-2 text-sm">AI 助手将实时流式回复你的消息</p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            // 仅对最后一条 assistant 消息暴露重新生成入口，避免历史消息反复触发
            onRegenerate={
              message.id === lastAssistantMessageId
                ? () => onRegenerate?.(message.id)
                : undefined
            }
            isRegenerating={isRegenerating}
          />
        ))}

        {/* 助手尚未返回首段内容时，显示打字动画 */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex space-x-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></span>
              </div>
            </div>
          </div>
        )}

        {/* 流式请求出错时展示友好提示，并提供重试入口 */}
        {error && (
          <ChatError
            error={error}
            onRetry={onRetry}
            isRetrying={isRegenerating}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
