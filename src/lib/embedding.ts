/**
 * @file embedding.ts
 * @description Embedding 生成服务：封装 AI SDK 的 embedMany，支持百炼 text-embedding-v3
 * 与 OpenAI text-embedding-3-small，供 RAG 向量化流程调用。
 */
import { embedMany, embed } from 'ai';
import { bailian, openai } from './ai';

/** 默认使用百炼 text-embedding-v3，输出 1024 维向量 */
export const DEFAULT_EMBEDDING_PROVIDER = 'bailian' as const;
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-v3' as const;
export const DEFAULT_EMBEDDING_DIMENSION = 1024;

/** 支持的 embedding Provider */
export type EmbeddingProvider = 'bailian' | 'openai';

/** embedding 模型配置 */
export interface EmbeddingModelConfig {
  provider: EmbeddingProvider;
  model: string;
}

/**
 * 从环境变量读取 embedding 配置，未配置时走默认值。
 * - EMBEDDING_PROVIDER: bailian | openai
 * - EMBEDDING_MODEL: 如 text-embedding-v3 / text-embedding-3-small
 */
function getEnvEmbeddingConfig(): EmbeddingModelConfig {
  const provider =
    (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) ?? DEFAULT_EMBEDDING_PROVIDER;
  const model = process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  return { provider, model };
}

/**
 * 获取 embedding 模型实例。
 * @param config - 可选，覆盖环境变量的模型配置
 */
export function getEmbeddingModel(config?: Partial<EmbeddingModelConfig>) {
  const envConfig = getEnvEmbeddingConfig();
  const provider = config?.provider ?? envConfig.provider;
  const model = config?.model ?? envConfig.model;

  if (provider === 'bailian') {
    return bailian.textEmbedding(model);
  }

  if (provider === 'openai') {
    return openai.textEmbedding(model);
  }

  throw new Error(`不支持的 embedding provider：${provider}`);
}

/**
 * 批量生成文本向量。
 *
 * @param texts - 待向量化的文本数组
 * @param config - 可选，覆盖默认的 embedding 模型配置
 * @returns 与输入顺序一致的向量数组
 */
export async function generateEmbeddings(
  texts: string[],
  config?: Partial<EmbeddingModelConfig>
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: getEmbeddingModel(config),
    values: texts,
  });

  return embeddings;
}

/**
 * 单条文本向量化（批量优先，仅在 Provider 不支持批量时使用）。
 *
 * @param text - 待向量化的文本
 * @param config - 可选，覆盖默认的 embedding 模型配置
 * @returns 1024 或 1536 维向量（取决于模型）
 */
export async function generateEmbedding(
  text: string,
  config?: Partial<EmbeddingModelConfig>
): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(config),
    value: text,
  });
  return embedding;
}
