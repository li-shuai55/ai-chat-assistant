'use client';

/**
 * @file ChatMessageList.tsx
 * @description 消息列表：空态引导、流式加载动画、错误提示，新消息自动滚底。
 *
 * 滚动优化：
 * - 使用 requestAnimationFrame 合并高频滚动触发，避免每次 token 更新都触发平滑滚动。
 * - 流式生成时使用 `behavior: 'auto'` 即时滚动，非流式新增消息使用平滑滚动。
 * - 增加“近底检测”：只有用户在底部 80px 范围内才自动滚底，向上翻看历史时不会被强制拉回。
 */
import { useEffect, useRef, useCallback } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';
import { ChatError } from './ChatError';

/** 提取 UI message 中的文本内容 */
function getMessageText(message?: UIMessage): string {
  if (!message) return '';
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

interface ChatMessageListProps {
  messages: UIMessage[];
  error?: Error | null;
  isLoading?: boolean;
  /** 是否正处于流式生成中（status === 'streaming'） */
  isStreaming?: boolean;
  /** 重新生成回调：对最后一条 assistant 消息传入 */
  onRegenerate?: (messageId: string) => void;
  /** 是否处于重新生成中：用于禁用按钮 */
  isRegenerating?: boolean;
  /** 错误重试回调：点击“重试”时触发 */
  onRetry?: () => void;
}

/**
 * 消息列表组件：渲染消息气泡、空态、加载动画与错误提示，并自动管理滚动。
 */
export function ChatMessageList({
  messages,
  error,
  isLoading,
  isStreaming,
  onRegenerate,
  isRegenerating,
  onRetry,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * 判断用户当前是否位于消息列表底部附近。
   * 阈值设为 80px：只要用户没有明显向上翻看历史，就继续自动跟随新消息。
   */
  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const threshold = 80;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      threshold
    );
  }, []);

  /**
   * 消息更新或加载状态变化时，使用 requestAnimationFrame 批量触发滚动。
   * - 用户不在底部时不自动滚动，避免打断阅读历史。
   * - 流式过程中使用即时滚动，避免平滑滚动与高频更新冲突导致掉帧。
   * - 非流式新增消息使用平滑滚动，体验更自然。
   */
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (!isNearBottom()) return;

      const behavior = isLoading ? 'auto' : 'smooth';
      bottomRef.current?.scrollIntoView({ behavior });
    });

    return () => cancelAnimationFrame(rafId);
  }, [messages, isLoading, isNearBottom]);

  // 找到最后一条 assistant 消息的 id，仅对该消息展示“重新生成”按钮并启用流式优化
  const lastAssistantMessageId =
    [...messages].reverse().find((message) => message.role === 'assistant')?.id ?? null;

  /**
   * 稳定化重新生成回调引用。
   * 配合 ChatMessage 的 React.memo 自定义比较函数，避免每次父组件渲染都产生新的函数引用，
   * 从而导致历史已完成消息被误判为需要更新。
   */
  const handleRegenerate = useCallback(
    (messageId: string) => onRegenerate?.(messageId),
    [onRegenerate]
  );

  return (
    // overscroll-contain：滚动消息列表到边界时阻止滚动链传递（浏览器回退/下拉刷新），
    // 移动端聊天页的常见体验问题
    <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {messages.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg font-medium">输入文字，开始对话</p>
            <p className="mt-2 text-sm">AI 助手将实时流式回复你的消息</p>
          </div>
        )}

        {messages.map((message, index) => {
          // 对 assistant 消息，找到它前面最近一条用户消息作为检索 query
          const precedingUser =
            message.role === 'assistant'
              ? messages
                  .slice(0, index)
                  .reverse()
                  .find((m) => m.role === 'user')
              : undefined;
          const query = precedingUser ? getMessageText(precedingUser) : undefined;

          return (
            <ChatMessage
              key={message.id}
              message={message}
              query={query}
              // 仅对最后一条 assistant 消息启用流式优化，避免历史消息也进行拆分逻辑
              isStreaming={
                isStreaming && message.id === lastAssistantMessageId ? true : undefined
              }
              // 仅对最后一条 assistant 消息暴露重新生成入口，避免历史消息反复触发
              onRegenerate={
                message.id === lastAssistantMessageId
                  ? () => handleRegenerate(message.id)
                  : undefined
              }
              isRegenerating={isRegenerating}
            />
          );
        })}

        {/* 助手尚未返回首段内容时，显示打字动画 */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.1s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.2s]"></span>
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
