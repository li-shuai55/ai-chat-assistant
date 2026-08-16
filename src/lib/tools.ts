/**
 * @file tools.ts
 * @description 使用 Vercel AI SDK tool() 定义的模型可调用的工具集合。
 *
 * AI SDK v7 中，工具通过 `tool()` 工厂函数声明：
 * - description: 告诉模型这个工具是做什么的，决定模型何时调用它。
 * - inputSchema: 用 zod schema 描述参数结构（v7 字段名改为 inputSchema，旧版叫 parameters），
 *   模型会据此生成合法调用，AI SDK 也会校验模型输出。
 * - execute: 实际执行函数，第一个参数是已校验的 input，第二个参数包含 abortSignal 等执行选项，
 *   返回的结果会作为 tool-result part 送回模型。
 *
 * 定义完成后，将 tools 对象传入 `streamText({ tools, ... })` 即可启用 Agent / Tool Use。
 */
import { tool } from 'ai';
import { z } from 'zod';
import { retrieveRelevantChunks, formatRetrievalContext } from './retrieval';

/**
 * 当前时间工具。
 * 当模型需要回答与时间相关的问题时调用。
 */
export const getCurrentTime = tool({
  description: '获取当前系统时间，返回 ISO 8601 格式字符串与本地格式化时间。',
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe('可选的时区，例如 "Asia/Shanghai"、"UTC"；不传则使用服务器本地时区'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    const resolvedTimezone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = resolvedTimezone === 'UTC' ? 'en-US' : 'zh-CN';
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: resolvedTimezone,
      dateStyle: 'full',
      timeStyle: 'long',
    });

    return {
      iso: now.toISOString(),
      local: now.toLocaleString('zh-CN', { timeZone: resolvedTimezone }),
      formatted: formatter.format(now),
      timezone: resolvedTimezone,
    };
  },
});

/**
 * 知识库检索工具。
 * 让模型能够主动查询已上传文档中的相关内容，替代被动 RAG 注入。
 */
export const searchKnowledgeBase = tool({
  description:
    '从用户上传的知识库文档中检索与问题最相关的文本片段。当用户询问文档、资料、手册、产品说明等内容时使用。',
  inputSchema: z.object({
    query: z.string().describe('用于检索知识库的查询文本，建议提取用户问题的核心关键词。'),
    knowledgeBaseId: z
      .string()
      .optional()
      .describe('可选：限定检索某个知识库 ID；不传则检索全部知识库。'),
    topK: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('返回的最相关片段数量，默认 5。'),
  }),
  execute: async ({ query, knowledgeBaseId, topK = 5 }) => {
    try {
      const chunks = await retrieveRelevantChunks(query, {
        knowledgeBaseId,
        topK,
        minSimilarity: 0.5,
      });

      if (chunks.length === 0) {
        return {
          found: false,
          message: '未在知识库中找到相关内容。',
          context: '',
        };
      }

      return {
        found: true,
        count: chunks.length,
        context: formatRetrievalContext(chunks),
        sources: chunks.map((c) => ({
          fileName: c.fileName,
          documentId: c.documentId,
          knowledgeBaseId: c.knowledgeBaseId,
          similarity: Number((1 - c.distance).toFixed(4)),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        found: false,
        message: `知识库检索失败：${message}`,
        context: '',
      };
    }
  },
});

/**
 * 数学计算工具。
 * 让模型把精确计算交给代码执行，避免 LLM 在数字运算上出错。
 */
export const calculate = tool({
  description:
    '执行数学表达式计算。支持 +、-、*、/、**、%、括号与常见 Math 函数（如 sqrt、sin、cos、abs）。当问题涉及精确数值计算时调用。',
  inputSchema: z.object({
    expression: z.string().describe('要计算的数学表达式，例如 "(23 + 17) * 2 / 5" 或 "Math.sqrt(144)"'),
  }),
  execute: async ({ expression }) => {
    try {
      // 使用 Function 构造器在受限白名单内计算表达式
      const allowedPattern = /^[\d\s+\-*/().,%^MathsqrtabcosintanlogexpPIEabsroundfloorceil]+$/i;
      if (!allowedPattern.test(expression)) {
        return {
          error: '表达式包含非法字符，仅允许数字、运算符与 Math 函数。',
        };
      }

      // 替换 ^ 为 **
      const normalized = expression.replace(/\^/g, '**');
      const fn = new Function(`
        const { sqrt, sin, cos, tan, log, exp, abs, round, floor, ceil, PI, E } = Math;
        return (${normalized});
      `);
      const result = fn();

      return {
        expression,
        result: Number.isFinite(result) ? result : '计算结果非有限数',
      };
    } catch (error) {
      return {
        expression,
        error: error instanceof Error ? error.message : '计算失败',
      };
    }
  },
});

/**
 * 模拟天气查询工具。
 * 实际项目中应接入真实天气 API；这里仅作为工具调用示例。
 */
export const getWeather = tool({
  description: '查询指定城市的当前天气。当用户询问天气、气温、降雨等情况时调用。',
  inputSchema: z.object({
    city: z.string().describe('城市名称，例如 "北京"、"Shanghai"'),
    unit: z
      .enum(['celsius', 'fahrenheit'])
      .optional()
      .describe('温度单位，默认摄氏度。'),
  }),
  execute: async ({ city, unit = 'celsius' }) => {
    // 模拟天气数据；生产环境请替换为真实 API 调用
    const mockData: Record<string, { condition: string; temp: number }> = {
      北京: { condition: '晴', temp: 26 },
      上海: { condition: '多云', temp: 28 },
      杭州: { condition: '小雨', temp: 24 },
      深圳: { condition: '雷阵雨', temp: 30 },
    };

    const info = mockData[city] ?? { condition: '晴', temp: 22 };
    const temp = unit === 'fahrenheit' ? Math.round(info.temp * 1.8 + 32) : info.temp;

    return {
      city,
      condition: info.condition,
      temperature: temp,
      unit: unit === 'fahrenheit' ? '°F' : '°C',
      updatedAt: new Date().toISOString(),
      note: '当前为模拟数据，生产环境请接入真实天气服务。',
    };
  },
});

/**
 * 所有可用工具的集合。
 * 直接展开到 `streamText({ tools, ... })` 中即可启用。
 */
export const chatTools = {
  getCurrentTime,
  searchKnowledgeBase,
  calculate,
  getWeather,
};

/** 工具名称类型，便于前端/类型系统引用 */
export type ChatToolName = keyof typeof chatTools;
