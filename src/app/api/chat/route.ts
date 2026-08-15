/**
 * @file route.ts
 * @description 对话流式 API：接收 UI messages 与模型配置，调用指定 Provider 流式返回
 */
import {
  streamText,
  convertToModelMessages,
  APICallError,
  LoadAPIKeyError,
  NoSuchModelError,
  AISDKError,
  type UIMessage,
} from 'ai';
import { getModel, isSupportedModel, SUPPORTED_PROVIDERS } from '@/src/lib/ai';
import type { ModelProvider } from '@/src/types/chat';
import { retrieveRelevantChunks } from '@/src/lib/retrieval';
import { buildRagSystemPrompt } from '@/src/lib/rag-prompt';
import { NextResponse } from 'next/server';

/** 客户端请求体中携带的模型配置字段 */
interface ChatRequestBody {
  messages: UIMessage[];
  provider?: ModelProvider;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemPrompt?: string;
  /** 可选：指定要检索的知识库 ID；不传则检索全部 */
  knowledgeBaseId?: string;
}

/**
 * 将异常转换为面向用户的中文友好提示。
 * 按错误类型分类：API 密钥、模型不存在、API 调用状态码、通用 AI SDK 错误等。
 */
function getFriendlyErrorMessage(error: unknown): string {
  // API 密钥未配置或格式错误
  if (LoadAPIKeyError.isInstance(error)) {
    return 'API 密钥配置有误，请检查对应 Provider 的环境变量';
  }

  // 模型不存在或不可用
  if (NoSuchModelError.isInstance(error)) {
    return '当前模型不可用，请检查模型名称或稍后再试';
  }

  // Provider API 调用错误：根据 HTTP 状态码给出更精确提示
  if (APICallError.isInstance(error)) {
    const { statusCode } = error;

    if (statusCode === 401 || statusCode === 403) {
      return 'API 密钥无效或权限不足，请检查密钥配置';
    }

    if (statusCode === 429) {
      return '请求过于频繁，请稍后再试';
    }

    if (statusCode && statusCode >= 500) {
      return 'AI 服务暂时不可用，请稍后再试';
    }

    return '调用 AI 服务失败，请稍后再试';
  }

  // 其他 AI SDK 错误：使用其原始消息
  if (AISDKError.isInstance(error)) {
    return error.message;
  }

  // 普通 Error 实例
  if (error instanceof Error) {
    return error.message;
  }

  return '发生未知错误，请稍后再试';
}

/**
 * 校验客户端传入的 Provider 与模型是否合法。
 * 不合法时返回结构化的 400 响应，便于前端提示用户。
 */
function validateModelConfig(
  provider: ModelProvider | undefined,
  model: string | undefined
): { ok: true } | { ok: false; message: string } {
  if (!provider || !SUPPORTED_PROVIDERS[provider]) {
    return { ok: false, message: `不支持的 Provider：${provider ?? 'undefined'}` };
  }

  const providerMeta = SUPPORTED_PROVIDERS[provider];
  const resolvedModel = model ?? providerMeta.defaultModel;

  if (!isSupportedModel(provider, resolvedModel)) {
    return {
      ok: false,
      message: `Provider ${provider} 不支持模型：${resolvedModel}`,
    };
  }

  return { ok: true };
}

/**
 * 校验生成参数范围。
 * 范围从 SUPPORTED_PROVIDERS 中按 Provider 读取，避免前端传入该 Provider 不支持的值。
 */
function validateGenerationParams(
  provider: ModelProvider,
  temperature: number | undefined,
  maxOutputTokens: number | undefined
): { ok: true } | { ok: false; message: string } {
  const { generationParams } = SUPPORTED_PROVIDERS[provider];

  if (
    temperature !== undefined &&
    (temperature < generationParams.temperature.min ||
      temperature > generationParams.temperature.max ||
      Number.isNaN(temperature))
  ) {
    return {
      ok: false,
      message: `temperature 必须在 ${generationParams.temperature.min} 到 ${generationParams.temperature.max} 之间`,
    };
  }

  if (
    maxOutputTokens !== undefined &&
    (!Number.isInteger(maxOutputTokens) ||
      maxOutputTokens < generationParams.maxOutputTokens.min ||
      maxOutputTokens > generationParams.maxOutputTokens.max)
  ) {
    return {
      ok: false,
      message: `maxOutputTokens 必须是 ${generationParams.maxOutputTokens.min}–${generationParams.maxOutputTokens.max} 的整数`,
    };
  }

  return { ok: true };
}

/**
 * 从 UI message 中提取纯文本内容。
 * AI SDK v4/v7 的 UIMessage 使用 parts 结构，需要过滤 text part。
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * 对话接口：客户端经 DefaultChatTransport 发送 UI messages 与模型配置，
 * 服务端转为 model messages 后按指定 Provider/模型/参数流式生成，并以 UI message 流返回。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, provider, model, temperature, maxOutputTokens, systemPrompt, knowledgeBaseId } = body;

    // 基础参数校验：messages 必须为数组，避免后续转换异常
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: '请求参数错误：messages 必须是数组' },
        { status: 400 }
      );
    }

    // 未指定 provider / model 时回退到默认的 bailian/qwen-plus，
    // 保证旧客户端或外部调用在不传配置时仍能工作。
    const resolvedProvider = provider ?? 'bailian';
    const resolvedModel = model ?? SUPPORTED_PROVIDERS[resolvedProvider].defaultModel;

    // 校验 Provider / 模型组合
    const modelValidation = validateModelConfig(resolvedProvider, resolvedModel);
    if (!modelValidation.ok) {
      return NextResponse.json({ error: modelValidation.message }, { status: 400 });
    }

    // 校验生成参数范围
    const paramsValidation = validateGenerationParams(resolvedProvider, temperature, maxOutputTokens);
    if (!paramsValidation.ok) {
      return NextResponse.json({ error: paramsValidation.message }, { status: 400 });
    }

    // DefaultChatTransport 发送的是 UI messages（带 parts），
    // streamText 需要的是 model/core messages，因此先转换格式。
    const modelMessages = await convertToModelMessages(messages);

    // RAG 检索：取最后一条用户消息作为查询，从 pgvector 检索相关知识库内容，
    // 再用 LangChain PromptTemplate 拼入 system prompt。
    // 检索失败只记录日志，不阻塞对话，避免 embedding 服务异常时聊天完全不可用。
    let contextualSystemPrompt = systemPrompt?.trim() ?? '';
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

    if (lastUserMessage) {
      try {
        const query = getMessageText(lastUserMessage);
        if (query.trim()) {
          const chunks = await retrieveRelevantChunks(query, {
            knowledgeBaseId,
            topK: 5,
          });
          if (chunks.length > 0) {
            contextualSystemPrompt = await buildRagSystemPrompt({
              basePrompt: contextualSystemPrompt,
              chunks,
            });
          }
        }
      } catch (error) {
        console.error('RAG retrieval error:', error);
      }
    }

    const result = streamText({
      model: getModel(resolvedProvider, resolvedModel),
      messages: modelMessages,
      temperature,
      maxOutputTokens,
      // 仅当 systemPrompt（含检索上下文）非空时传入，避免部分 Provider 对空 system 报错
      ...(contextualSystemPrompt ? { system: contextualSystemPrompt } : {}),
    });

    // 注：toUIMessageStreamResponse 在 ai v7 已标记 deprecated，与 DefaultChatTransport 配套可用
    return result.toUIMessageStreamResponse({
      // 流式过程中发生错误时，将友好提示随流返回给客户端
      onError: (error) => {
        console.error('Chat stream error:', error);
        return getFriendlyErrorMessage(error);
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = getFriendlyErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
