'use client';

/**
 * @file page.tsx
 * @description 应用首页：触发 Zustand 持久化水合，水合完成后渲染聊天界面
 */
import { useEffect } from 'react';
import { useChatStore } from '@/src/stores/chatStore';
import { ChatLayout } from '@/src/components/chat/ChatLayout';

export default function Home() {
  const hydrated = useChatStore((state) => state.hydrated);

  // store 配置了 skipHydration，需手动触发 localStorage 数据重新水合
  useEffect(() => {
    if (!hydrated) {
      void useChatStore.persist.rehydrate();
    }
  }, [hydrated]);

  // 服务端渲染或水合未完成时显示占位，避免本地会话数据闪烁丢失
  if (typeof window === 'undefined' || !hydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-400">
        加载中...
      </div>
    );
  }

  return <ChatLayout />;
}
