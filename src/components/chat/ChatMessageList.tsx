'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: UIMessage[];
  error?: Error | null;
  isLoading?: boolean;
}

export function ChatMessageList({
  messages,
  error,
  isLoading,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
          <ChatMessage key={message.id} message={message} />
        ))}

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

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            出错了：{error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
