/**
 * @file route.ts
 * @description 对话流式 API：接收 UI messages，转换格式后调用千问模型流式返回
 */
import { streamText, convertToModelMessages } from 'ai';
import { bailian } from '@/src/lib/ai';
import { NextResponse } from 'next/server';

/**
 * 对话接口：客户端经 DefaultChatTransport 发送 UI messages，
 * 服务端转为 model messages 后流式生成，并以 UI message 流返回。
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // DefaultChatTransport 发送的是 UI messages（带 parts），
    // streamText 需要的是 model/core messages，因此先转换格式。
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: bailian('qwen-plus'),
      messages: modelMessages,
    });

    // 注：toUIMessageStreamResponse 在 ai v7 已标记 deprecated，与 DefaultChatTransport 配套可用
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('Chat stream error:', error);
        return error instanceof Error ? error.message : 'An error occurred.';
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
