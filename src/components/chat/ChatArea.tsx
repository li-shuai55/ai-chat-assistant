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

/** 提取 UI 消息中的文本内容 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

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
  const touchSession = useChatStore((state) => state.touchSession);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const toggleSidebar = useChatStore((state) => state.toggleSidebar);

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: session.id,
    transport,
    messages: session.messages,
    // 客户端发生错误时记录日志，便于排查网络或 API 问题
    onError: (err) => {
      console.error('Chat client error:', err);
    },
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

  // 卸载（切换会话/关闭页面）时把内存中的最新消息回写 store；
  // 此处只持久化消息，不刷新 updatedAt，避免切换会话导致排序跳动
  useEffect(() => {
    return () => {
      updateSessionMessages(session.id, messagesRef.current);
    };
  }, [session.id, updateSessionMessages]);

  // 请求已提交或正在流式生成，视为加载态
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (text: string) => {
    touchSession(session.id);
    await sendMessage({ text });
  };

  /**
   * 重新生成指定 assistant 消息的回复。
   * 不传 messageId 时 AI SDK 默认重新生成最后一条 assistant 消息；
   * 这里显式传入最后一条 assistant 消息的 id，使行为与 UI 入口对应。
   */
  const handleRegenerate = async (messageId: string) => {
    await regenerate({ messageId });
  };

  /**
   * 错误重试：根据最后一条消息的角色决定重试策略。
   * - 最后一条是 assistant：调用 regenerate 重新生成该回复
   * - 最后一条是 user：提取文本后重新发送用户消息
   */
  const handleRetry = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.role === 'assistant') {
      await regenerate({ messageId: lastMessage.id });
    } else if (lastMessage.role === 'user') {
      const text = getMessageText(lastMessage);
      if (text.trim()) {
        touchSession(session.id);
        await sendMessage({ text });
      }
    }
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

      <ChatMessageList
        messages={messages}
        error={error}
        isLoading={isLoading}
        onRegenerate={handleRegenerate}
        isRegenerating={isLoading}
        onRetry={handleRetry}
      />

      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onStop={stop}
      />
    </div>
  );
}
