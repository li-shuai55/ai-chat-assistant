'use client';

/**
 * @file ChatMessage.tsx
 * @description 单条消息气泡：用户消息纯文本右对齐，AI 消息 Markdown 渲染左对齐。
 *
 * 性能优化：
 * - 流式生成时，将 AI 消息拆分为“已定型（committedText）”与“待定（pendingText）”两部分。
 *   已定型部分使用完整 Markdown + 语法高亮渲染（低频更新），待定部分使用纯文本轻量渲染（高频更新）。
 *   避免 react-markdown + rehype-highlight 在每次 token 到达时全量重解析，从而显著降低长文本流式卡顿。
 * - 使用 React.memo + 自定义比较函数包裹组件，历史已完成消息在流式过程中不再重复渲染。
 */
import React, { useState, useCallback, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, RefreshCw } from 'lucide-react';
import type { UIMessage } from 'ai';
import { cn } from '@/src/lib/utils';
import { useStreamingText } from '@/src/hooks/useStreamingText';

interface ChatMessageProps {
  /** AI SDK 的 UI 消息对象 */
  message: UIMessage;
  /** 是否正处于流式生成中：仅最后一条 assistant 消息为 true */
  isStreaming?: boolean;
  /** 重新生成回调：仅对需要展示“重新生成”按钮的 assistant 消息传入 */
  onRegenerate?: () => void;
  /** 是否处于生成中：用于禁用重新生成按钮，避免重复触发 */
  isRegenerating?: boolean;
}

/** 提取消息 parts 中的全部文本片段（AI SDK UI Message 结构） */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * 递归提取 React 节点中的纯文本。
 * react-markdown 渲染代码块后，pre 的 children 是带高亮 span 的 code 元素，
 * 本函数用于忽略样式标签，提取原始代码字符串供复制按钮使用。
 */
function getNodeText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return '';
}

/**
 * 代码块右上角复制按钮。
 * 悬停时显示，点击后调用 Clipboard API 复制代码，并在 2 秒内显示“已复制”。
 */
function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  // 按钮固定使用浅色系：代码块背景在两种主题下均为深色（--code-block-bg），
  // 因此按钮文字/背景不随主题变化
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-code-block-fg/80 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
      aria-label={copied ? '已复制' : '复制代码'}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          复制
        </>
      )}
    </button>
  );
}

/**
 * 单条消息组件：按角色区分气泡样式，assistant 消息经 Markdown + 代码高亮渲染。
 *
 * 用户消息保持原样（whitespace-pre-wrap），assistant 消息使用 react-markdown 解析，
 * 通过 Tailwind Typography 的 prose 类控制段落、列表、标题间距，通过自定义 pre/code
 * 组件实现深色代码块背景与复制按钮。
 *
 * 流式生成时，assistant 消息的已定型文本走完整 Markdown 渲染，待定文本使用纯文本追加，
 * 避免高频 token 更新触发全量重解析。
 */
function ChatMessageComponent({
  message,
  isStreaming,
  onRegenerate,
  isRegenerating,
}: ChatMessageProps) {
  const text = getMessageText(message);
  const isUser = message.role === 'user';

  // 对所有 assistant 消息都调用 Hook；非流式时 committedText 直接等于 text，pendingText 为空
  const { committedText, pendingText } = useStreamingText({
    text,
    isStreaming: isStreaming ?? false,
  });

  // 已定型 Markdown 使用 useMemo 缓存，只有 committedText 变化时才重新创建 ReactMarkdown 元素，
  // 减少待定文本高频更新时 react-markdown + rehype-highlight 的重复解析开销
  const markdownContent = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义代码块容器：添加相对定位与复制按钮；pre 本身去掉默认 margin，
          // 由外层 div 控制上下间距，保持气泡内紧凑
          pre: ({ children }) => {
            const codeText = getNodeText(children);
            return (
              <div className="group relative my-3">
                <CodeCopyButton code={codeText} />
                {/* 代码块背景/文字使用 --code-block-bg/--code-block-fg 语义化 token，
                    深浅色主题下自动适配（浅色为深灰底，深色为近黑底） */}
                <pre className="m-0 overflow-x-auto rounded-lg bg-code-block-bg p-3 text-sm text-code-block-fg">
                  {children}
                </pre>
              </div>
            );
          },
          // 自定义 code 元素：无 language 类时为行内代码，使用灰底红字；
          // 有 language 类时为代码块内的 code，保留 rehype-highlight 注入的高亮类
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return (
              <code
                className={cn(
                  isInline
                    ? 'rounded bg-muted px-1 py-0.5 text-sm font-medium text-rose-600 dark:text-rose-400'
                    : 'font-mono text-sm',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {committedText}
      </ReactMarkdown>
    ),
    [committedText]
  );

  return (
    <div
      className={cn(
        'flex w-full flex-col',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {/* 气泡配色使用语义化 token：用户消息主色（primary），AI 消息表面色（surface） */}
      <div
        className={cn(
          'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-surface text-foreground shadow-sm border border-border rounded-bl-sm'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          // prose：Tailwind Typography 提供的默认排版；prose-slate 使用 slate 灰阶；
          // dark:prose-invert 在深色模式下反转排版色，避免深色背景上文字过暗；
          // 各类 prose-*: 修饰符用于压缩消息气泡内的间距，避免标题/列表/代码块过大
          <div className="prose prose-sm max-w-none prose-slate prose-p:my-1 prose-pre:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mb-2 prose-headings:mt-3 dark:prose-invert">
            {committedText && markdownContent}
            {/* 待定文本：尚未到达安全边界，使用纯文本轻量渲染，避免高频更新触发完整 Markdown 解析 */}
            {pendingText && (
              <span className="whitespace-pre-wrap text-foreground">{pendingText}</span>
            )}
          </div>
        )}
      </div>

      {/* AI 消息操作栏：仅当传入 onRegenerate 时展示重新生成按钮 */}
      {!isUser && onRegenerate && (
        <div className="mt-1">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="重新生成"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ChatMessage 自定义比较函数：
 * 1. 流式消息必须继续渲染，不能复用；
 * 2. 重新生成按钮状态变化时重新渲染；
 * 3. onRegenerate 引用变化时重新渲染（通常由父级 useCallback 稳定）；
 * 4. 消息 id 或文本内容变化时重新渲染；
 * 5. 其他情况复用，避免历史已完成消息在流式过程中重复渲染。
 */
function chatMessagePropsAreEqual(
  prev: ChatMessageProps,
  next: ChatMessageProps
): boolean {
  if (prev.isStreaming || next.isStreaming) return false;
  if (prev.isRegenerating !== next.isRegenerating) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  if (prev.message.id !== next.message.id) return false;
  if (getMessageText(prev.message) !== getMessageText(next.message)) return false;
  return true;
}

export const ChatMessage = memo(ChatMessageComponent, chatMessagePropsAreEqual);
