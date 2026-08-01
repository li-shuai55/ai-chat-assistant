import { streamText, convertToModelMessages } from 'ai';
import { bailian } from '@/src/lib/ai';
import { NextResponse } from 'next/server';

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
