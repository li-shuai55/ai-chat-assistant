/**
 * @file route.ts
 * @description 对话流式 API：接收 UI messages，转换格式后调用千问模型流式返回
 */
import {
  streamText,
  convertToModelMessages,
  APICallError,
  LoadAPIKeyError,
  NoSuchModelError,
  AISDKError,
} from 'ai';
import { bailian } from '@/src/lib/ai';
import { NextResponse } from 'next/server';

/**
 * 将异常转换为面向用户的中文友好提示。
 * 按错误类型分类：API 密钥、模型不存在、API 调用状态码、通用 AI SDK 错误等。
 */
function getFriendlyErrorMessage(error: unknown): string {
  // API 密钥未配置或格式错误
  if (LoadAPIKeyError.isInstance(error)) {
    return 'API 密钥配置有误，请检查环境变量 BAILIAN_API_KEY';
  }

  // 模型不存在或不可用
  if (NoSuchModelError.isInstance(error)) {
    return '当前模型不可用，请检查模型名称或稍后再试';
  }

  // -provider API 调用错误：根据 HTTP 状态码给出更精确提示
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
 * 对话接口：客户端经 DefaultChatTransport 发送 UI messages，
 * 服务端转为 model messages 后流式生成，并以 UI message 流返回。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    // 基础参数校验：messages 必须为数组，避免后续转换异常
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: '请求参数错误：messages 必须是数组' },
        { status: 400 }
      );
    }

    // DefaultChatTransport 发送的是 UI messages（带 parts），
    // streamText 需要的是 model/core messages，因此先转换格式。
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: bailian('qwen-plus'),
      messages: modelMessages,
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
