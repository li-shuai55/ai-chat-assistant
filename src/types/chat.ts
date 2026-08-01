import type { UIMessage } from 'ai';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

export type ChatMessage = UIMessage;

export type MessageRole = 'user' | 'assistant' | 'system' | 'data';
