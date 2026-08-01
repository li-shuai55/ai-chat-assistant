/**
 * @file chat.ts
 * @description 对话业务类型定义
 */
import type { UIMessage } from 'ai';

/** 一个会话：标题、时间戳与消息列表 */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

/** 单条消息：复用 AI SDK 的 UIMessage（消息内容在 parts 数组中） */
export type ChatMessage = UIMessage;

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'data';
