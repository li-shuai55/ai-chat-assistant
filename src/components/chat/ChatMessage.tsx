'use client';

/**
 * @file ChatMessage.tsx
 * @description 单条消息气泡：用户消息纯文本右对齐，AI 消息 Markdown 渲染左对齐
 *
 * AI 消息使用 react-markdown 解析 Markdown，配合 remark-gfm 支持表格/删除线/GFM 扩展语法，
 * 配合 rehype-highlight 实现代码块语法高亮。排版默认样式由 Tailwind Typography 插件的
 * prose 类提供，代码块额外提供右上角复制按钮。
 */
import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';
import type { UIMessage } from 'ai';
import { cn } from '@/src/lib/utils';

interface ChatMessageProps {
  /** AI SDK 的 UI 消息对象 */
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

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
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
          // prose：Tailwind Typography 提供的默认排版；prose-slate 使用 slate 灰阶；
          // 各类 prose-*: 修饰符用于压缩消息气泡内的间距，避免标题/列表/代码块过大
          <div className="prose prose-sm max-w-none prose-slate prose-p:my-1 prose-pre:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mb-2 prose-headings:mt-3">
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
                      <pre className="m-0 overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
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
