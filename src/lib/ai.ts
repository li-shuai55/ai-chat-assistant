/**
 * @file ai.ts
 * @description AI Provider 工厂与模型映射：支持 Bailian、OpenAI、Anthropic、DeepSeek 四端切换
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { LanguageModel } from 'ai';
import type { ModelProvider } from '@/src/types/chat';

/** 阿里百炼（DashScope，OpenAI 兼容协议） */
export const bailian = createOpenAI({
  apiKey: process.env.BAILIAN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/** OpenAI 官方 */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Anthropic Claude */
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** DeepSeek */
export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/** 单个生成参数的范围与步长 */
interface GenerationParamRange {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 步长 */
  step: number;
  /** 默认值 */
  default: number;
}

/** 单个 Provider 的元数据：显示名称、默认模型、可选模型列表、生成参数范围 */
interface ProviderMeta {
  /** 界面显示名称 */
  label: string;
  /** 默认使用的模型 ID */
  defaultModel: string;
  /** 该 Provider 下可供切换的模型 ID 列表 */
  models: string[];
  /** 生成参数范围：按 Provider 区分，避免对不支持的模型传入非法值 */
  generationParams: {
    temperature: GenerationParamRange;
    maxOutputTokens: GenerationParamRange;
  };
  /** 固定 temperature 的推理模型列表（如 DeepSeek-R1），前端会禁用温度调节并给出提示 */
  reasoningModels?: string[];
}

/**
 * 受支持的 Provider 配置表。
 * 新增 Provider 时只需在这里补充实例与模型列表，服务端/客户端会自动识别。
 */
export const SUPPORTED_PROVIDERS: Record<ModelProvider, ProviderMeta> = {
  bailian: {
    label: '阿里百炼',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    generationParams: {
      temperature: { min: 0, max: 2, step: 0.1, default: 0.7 },
      maxOutputTokens: { min: 1, max: 8192, step: 1, default: 2048 },
    },
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini'],
    generationParams: {
      temperature: { min: 0, max: 2, step: 0.1, default: 0.7 },
      maxOutputTokens: { min: 1, max: 16384, step: 1, default: 4096 },
    },
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    generationParams: {
      // Anthropic 官方 temperature 范围为 0–1
      temperature: { min: 0, max: 1, step: 0.1, default: 0.7 },
      maxOutputTokens: { min: 1, max: 8192, step: 1, default: 4096 },
    },
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    generationParams: {
      temperature: { min: 0, max: 2, step: 0.1, default: 0.7 },
      maxOutputTokens: { min: 1, max: 8192, step: 1, default: 2048 },
    },
    // DeepSeek-R1 为推理模型，temperature 通常固定为 1，用户设置不生效
    reasoningModels: ['deepseek-reasoner'],
  },
};

/** 将 Provider 字符串映射到实际的 SDK Provider 实例 */
const PROVIDER_INSTANCES: Record<
  ModelProvider,
  // 各 SDK 的 provider 函数签名略有不同，统一按 `(modelId: string) => LanguageModel` 使用
  (modelId: string) => LanguageModel
> = {
  bailian: (modelId) => bailian(modelId),
  openai: (modelId) => openai(modelId),
  anthropic: (modelId) => anthropic(modelId),
  deepseek: (modelId) => deepseek(modelId as 'deepseek-chat' | 'deepseek-reasoner'),
};

/**
 * 根据 Provider 与模型 ID 创建 AI SDK 模型实例。
 * @param provider - Provider 标识
 * @param modelId - 模型 ID；若未提供，使用该 Provider 的默认模型
 */
export function getModel(provider: ModelProvider, modelId?: string): LanguageModel {
  const providerMeta = SUPPORTED_PROVIDERS[provider];
  const resolvedModelId = modelId ?? providerMeta.defaultModel;
  return PROVIDER_INSTANCES[provider](resolvedModelId);
}

/**
 * 判断某个 Provider 与模型 ID 组合是否受支持。
 * 用于服务端请求校验，防止非法/拼写错误的模型请求触发 SDK 内部异常。
 */
export function isSupportedModel(provider: ModelProvider, modelId: string): boolean {
  return SUPPORTED_PROVIDERS[provider]?.models.includes(modelId) ?? false;
}
