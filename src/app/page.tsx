'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/src/stores/chatStore';
import { ChatLayout } from '@/src/components/chat/ChatLayout';

export default function Home() {
  const hydrated = useChatStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      void useChatStore.persist.rehydrate();
    }
  }, [hydrated]);

  if (typeof window === 'undefined' || !hydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-400">
        加载中...
      </div>
    );
  }

  return <ChatLayout />;
}
