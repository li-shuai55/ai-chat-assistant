'use client';

/**
 * @file ChatMessage.tsx
 * @description 单条消息气泡：用户消息纯文本右对齐，AI 消息 Markdown 渲染左对齐
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { UIMessage } from 'ai';
import { cn } from '@/src/lib/utils';

interface ChatMessageProps {
  message: UIMessage;
}

/** 提取消息 parts 中的全部文本片段（AI SDK UI Message 结构） */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * 单条消息组件：按角色区分气泡样式，assistant 消息经 Markdown + 代码高亮渲染
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const text = getMessageText(message);
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white text-gray-900 shadow-sm border border-gray-200 rounded-bl-sm'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return (
                    <code
                      className={cn(
                        isInline
                          ? 'rounded bg-gray-100 px-1 py-0.5 text-sm font-medium text-rose-600'
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
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
