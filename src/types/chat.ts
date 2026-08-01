/**
 * @file chat.ts
 * @description 对话业务类型定义
 */
import type { UIMessage } from 'ai';

/** 支持的 AI Provider 标识 */
export type ModelProvider = 'bailian' | 'openai' | 'anthropic' | 'deepseek';

/** 单条会话的模型与生成参数配置 */
export interface ModelConfig {
  /** 当前选用的 Provider */
  provider: ModelProvider;
  /** 具体模型 ID，例如 qwen-plus / gpt-4o */
  model: string;
  /** 采样温度，范围 0–2 */
  temperature: number;
  /** 最大输出 Token 数 */
  maxOutputTokens: number;
}

/** 一个会话：标题、时间戳、消息列表与模型配置 */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  /** 每个会话独立保存的模型与参数配置 */
  modelConfig: ModelConfig;
}

/** 单条消息：复用 AI SDK 的 UIMessage（消息内容在 parts 数组中） */
export type ChatMessage = UIMessage;

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'data';
