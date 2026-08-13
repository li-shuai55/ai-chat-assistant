/**
 * @file chat.ts
 * @description 对话业务类型定义
 */
import type { UIMessage } from 'ai';

/** 支持的 AI Provider 标识 */
export type ModelProvider = 'bailian' | 'openai' | 'anthropic' | 'deepseek';

/** Prompt 模板：可快速填充 system prompt 与可选模型参数 */
export interface PromptTemplate {
  /** 模板唯一标识 */
  id: string;
  /** 模板显示名称 */
  name: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 应用时是否覆盖 Provider；未指定则只填充 systemPrompt */
  provider?: ModelProvider;
  /** 应用时是否覆盖模型 */
  model?: string;
  /** 应用时是否覆盖温度 */
  temperature?: number;
  /** 应用时是否覆盖最大输出 Token 数 */
  maxOutputTokens?: number;
}

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
  /** 系统提示词，会作为 system message 传给模型，但不显示在聊天界面 */
  systemPrompt?: string;
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
