/**
 * @file ai.ts
 * @description AI Provider 工厂：当前使用阿里百炼（DashScope，OpenAI 兼容协议）
 */
import { createOpenAI } from '@ai-sdk/openai';

// 阿里百炼
export const bailian = createOpenAI({
  apiKey: process.env.BAILIAN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 如果用 OpenAI，取消下面注释
// export const openai = createOpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
