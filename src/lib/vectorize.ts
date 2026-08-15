/**
 * @file vectorize.ts
 * @description 文档向量化服务：把 DocumentChunk 的文本批量生成 embedding 后写入 pgvector。
 */
import { prisma } from './db';
import { generateEmbeddings } from './embedding';

/** 单次 embedding 调用的最大 chunk 数。
 * 百炼 text-embedding-v3 的 OpenAI 兼容接口限制单批次最多 10 条，
 * 超过会报 "batch size is invalid, it should not be larger than 10"。
 */
const EMBEDDING_BATCH_SIZE = 10;

/**
 * 将指定文档下尚未向量化的 chunk 生成 embedding 并写入数据库。
 *
 * @param documentId - 文档 ID
 * @returns 处理的 chunk 数量
 */
export async function vectorizeDocument(documentId: string): Promise<number> {
  // 1. 拉取该文档下未向量化的 chunk（embedding 为 null）
  const chunks = await prisma.$queryRaw<{ id: string; chunkIndex: number; content: string }[]>`
    SELECT id, "chunkIndex", content
    FROM "document_chunks"
    WHERE "documentId" = ${documentId} AND embedding IS NULL
    ORDER BY "chunkIndex" ASC
  `;

  if (chunks.length === 0) return 0;

  // 2. 标记文档处理中
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    // 3. 分批生成 embedding 并写入 pgvector
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((chunk) => chunk.content);
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        if (!chunk || !embedding) continue;

        const vectorString = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
          UPDATE "document_chunks"
          SET embedding = ${vectorString}::vector
          WHERE id = ${chunk.id}
        `;
      }
    }

    // 4. 标记文档已完成
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    return chunks.length;
  } catch (error) {
    console.error(`Vectorize document ${documentId} failed:`, error);

    // 失败时标记文档状态，方便前端/管理端重试
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * 对整个知识库进行向量化（用于批量补录或重试）。
 *
 * @param knowledgeBaseId - 知识库 ID
 * @returns 处理的 chunk 总数
 */
export async function vectorizeKnowledgeBase(knowledgeBaseId: string): Promise<number> {
  const documents = await prisma.document.findMany({
    where: { knowledgeBaseId },
    select: { id: true },
  });

  let total = 0;
  for (const document of documents) {
    total += await vectorizeDocument(document.id);
  }
  return total;
}
