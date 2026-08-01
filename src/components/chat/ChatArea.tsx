'use client';

import { useEffect, useRef } from 'react';
import { PanelLeft } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import type { DefaultChatTransport, UIMessage } from 'ai';
import type { ChatSession } from '@/src/types/chat';
import { useChatStore } from '@/src/stores/chatStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

interface ChatAreaProps {
  session: ChatSession;
  transport: DefaultChatTransport<UIMessage>;
}

export function ChatArea({ session, transport }: ChatAreaProps) {
  const updateSessionMessages = useChatStore((state) => state.updateSessionMessages);
  const maybeAutoTitle = useChatStore((state) => state.maybeAutoTitle);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const toggleSidebar = useChatStore((state) => state.toggleSidebar);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: session.id,
    transport,
    messages: session.messages,
    onFinish: ({ messages: finishedMessages }) => {
      updateSessionMessages(session.id, finishedMessages);
      maybeAutoTitle(session.id, finishedMessages);
    },
  });

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  });

  useEffect(() => {
    return () => {
      updateSessionMessages(session.id, messagesRef.current);
    };
  }, [session.id, updateSessionMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (text: string) => {
    await sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center border-b bg-white px-4 py-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded p-2 text-gray-600 transition-colors hover:bg-gray-100"
          aria-label={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-center text-base font-medium text-gray-900">
          {session.title}
        </h1>
        <div className="h-9 w-9" />
      </div>

      <ChatMessageList messages={messages} error={error} isLoading={isLoading} />

      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onStop={stop}
      />
    </div>
  );
}
