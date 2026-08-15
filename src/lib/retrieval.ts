/**
 * @file retrieval.ts
 * @description 基于 pgvector 的向量检索服务：把用户问题转成 embedding，
 * 在 document_chunks 中按余弦距离找出最相关的文本块。
 */
import { prisma } from './db';
import { generateEmbeddings } from './embedding';

/** 检索结果项 */
export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: string;
  knowledgeBaseId: string;
  /** 来源文档的原始文件名 */
  fileName: string;
  /** 余弦距离：0 表示完全相同，1 表示完全正交；相似度 = 1 - distance */
  distance: number;
}

/** 检索选项 */
export interface RetrieveOptions {
  /** 按知识库过滤；不传则检索全部 */
  knowledgeBaseId?: string;
  /** 返回最相关的 N 条，默认 5 */
  topK?: number;
  /** 最小相似度阈值（0-1），低于该值的 chunk 会被过滤；默认不开启 */
  minSimilarity?: number;
}

/**
 * 根据查询文本检索相关 chunk。
 *
 * @param query - 用户查询文本
 * @param options - 检索选项
 * @returns 按相似度排序的 chunk 列表
 */
export async function retrieveRelevantChunks(
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { knowledgeBaseId, topK = 5, minSimilarity } = options;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  // 1. 把查询文本转成 embedding
  const [queryEmbedding] = await generateEmbeddings([trimmedQuery]);
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const vectorString = `[${queryEmbedding.join(',')}]`;

  // 2. pgvector 余弦相似度检索（JOIN documents 获取原始文件名）
  // `<=>` 为余弦距离操作符；ORDER BY distance ASC 取最相似的 topK 条。
  const rows = knowledgeBaseId
    ? await prisma.$queryRaw<RetrievedChunk[]>`
        SELECT dc.id, dc.content, dc."documentId", dc."knowledgeBaseId", d."fileName",
               dc.embedding <=> ${vectorString}::vector AS distance
        FROM "document_chunks" dc
        JOIN "documents" d ON d.id = dc."documentId"
        WHERE dc.embedding IS NOT NULL
          AND dc."knowledgeBaseId" = ${knowledgeBaseId}
        ORDER BY dc.embedding <=> ${vectorString}::vector
        LIMIT ${topK}
      `
    : await prisma.$queryRaw<RetrievedChunk[]>`
        SELECT dc.id, dc.content, dc."documentId", dc."knowledgeBaseId", d."fileName",
               dc.embedding <=> ${vectorString}::vector AS distance
        FROM "document_chunks" dc
        JOIN "documents" d ON d.id = dc."documentId"
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> ${vectorString}::vector
        LIMIT ${topK}
      `;

  // 3. 归一化 distance 并应用阈值过滤
  const results = rows.map((row) => ({
    ...row,
    distance: Number(row.distance),
  }));

  if (minSimilarity !== undefined) {
    return results.filter((row) => 1 - row.distance >= minSimilarity);
  }

  return results;
}

/**
 * 把检索结果格式化为模型可读的上下文文本。
 *
 * @param chunks - retrieveRelevantChunks 返回的结果
 * @returns 拼接后的 context 字符串
 */
export function formatRetrievalContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';

  const sections = chunks.map(
    (chunk, index) => `[${index + 1}] ${chunk.fileName}:\n${chunk.content.trim()}`
  );

  return [
    '请参考以下知识库内容回答问题。如果内容中没有相关信息，请明确说明。',
    '请在相关论断后使用 [n] 标注引用来源。',
    '',
    ...sections,
  ].join('\n');
}
