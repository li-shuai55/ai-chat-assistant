'use client';

/**
 * @file ChatArea.tsx
 * @description 聊天主区域：绑定 useChat 与当前会话，负责流式对话与消息持久化
 */
import { useEffect, useRef } from 'react';
import { PanelLeft } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import type { DefaultChatTransport, UIMessage } from 'ai';
import type { ChatSession } from '@/src/types/chat';
import { useChatStore } from '@/src/stores/chatStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

interface ChatAreaProps {
  /** 当前活跃会话（其消息用于初始化 useChat 并回写持久化） */
  session: ChatSession;
  /** AI SDK 传输层实例（POST /api/chat 进行流式请求） */
  transport: DefaultChatTransport<UIMessage>;
}

/**
 * 聊天主区域组件：useChat 以 session.id 为 key 独立管理会话消息，
 * 流式结束时全量回写 store 完成持久化。
 */
export function ChatArea({ session, transport }: ChatAreaProps) {
  const updateSessionMessages = useChatStore((state) => state.updateSessionMessages);
  const maybeAutoTitle = useChatStore((state) => state.maybeAutoTitle);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const toggleSidebar = useChatStore((state) => state.toggleSidebar);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: session.id,
    transport,
    messages: session.messages,
    // 流式结束：全量回写消息，并用首条用户消息自动命名会话
    onFinish: ({ messages: finishedMessages }) => {
      updateSessionMessages(session.id, finishedMessages);
      maybeAutoTitle(session.id, finishedMessages);
    },
  });

  // 用 ref 缓存最新消息：组件卸载时兜底回写，避免切换会话瞬间丢消息
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  });

  // 卸载（切换会话/关闭页面）时把内存中的最新消息回写 store
  useEffect(() => {
    return () => {
      updateSessionMessages(session.id, messagesRef.current);
    };
  }, [session.id, updateSessionMessages]);

  // 请求已提交或正在流式生成，视为加载态
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
