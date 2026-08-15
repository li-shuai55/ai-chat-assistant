/**
 * @file rag-prompt.ts
 * @description 使用 LangChain PromptTemplate 把 RAG 检索结果拼入 system prompt。
 *
 * 这里只借用 LangChain 的 PromptTemplate 与 Document 抽象，
 * 模型调用仍由 AI SDK v7 的 streamText 负责，保持两者轻量结合。
 */
import { PromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';
import type { RetrievedChunk } from './retrieval';

/**
 * RAG 上下文部分的模板。
 * 变量：
 * - context：由检索结果格式化后的文本
 */
const RAG_CONTEXT_TEMPLATE = PromptTemplate.fromTemplate(
  `请参考以下知识库内容回答问题。如果内容中没有相关信息，请明确说明。

{context}`
);

/**
 * 当用户自定义了 systemPrompt 时，把基础 system prompt 与 RAG 上下文合并。
 * 变量：
 * - basePrompt：用户自定义的 system prompt
 * - ragContext：RAG 上下文字符串
 */
const RAG_SYSTEM_TEMPLATE = PromptTemplate.fromTemplate(
  `{basePrompt}

{ragContext}`
);

/**
 * 将检索结果转换成 LangChain Document，便于复用其格式化工具。
 */
function chunksToDocuments(chunks: RetrievedChunk[]): Document[] {
  return chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.content,
        metadata: {
          documentId: chunk.documentId,
          knowledgeBaseId: chunk.knowledgeBaseId,
          chunkId: chunk.id,
        },
      })
  );
}

/**
 * 根据检索 chunk 生成 RAG 上下文字符串。
 * 先把 chunk 转成 LangChain Document，再用统一的换行分隔格式化。
 */
export async function formatRagContext(chunks: RetrievedChunk[]): Promise<string> {
  if (chunks.length === 0) return '';

  const documents = chunksToDocuments(chunks);
  const context = documents.map((doc) => doc.pageContent.trim()).join('\n\n');
  const formatted = await RAG_CONTEXT_TEMPLATE.format({ context });
  return formatted;
}

/**
 * 构建最终送入模型的 system prompt。
 *
 * @param options.basePrompt - 用户自定义 system prompt（可选）
 * @param options.chunks - RAG 检索结果
 * @returns 拼接后的 system prompt 字符串
 */
export async function buildRagSystemPrompt(options: {
  basePrompt?: string;
  chunks: RetrievedChunk[];
}): Promise<string> {
  const { basePrompt, chunks } = options;
  const ragContext = await formatRagContext(chunks);

  // 没有自定义 system prompt 时，只返回 RAG 上下文
  const trimmedBase = basePrompt?.trim();
  if (!trimmedBase) {
    return ragContext;
  }

  // 否则把用户 system prompt 与 RAG 上下文合并
  return RAG_SYSTEM_TEMPLATE.format({
    basePrompt: trimmedBase,
    ragContext,
  });
}
