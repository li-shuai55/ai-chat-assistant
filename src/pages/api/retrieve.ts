/**
 * @file pages/api/retrieve.ts
 * @description 向量检索测试接口：根据查询文本返回最相关的 document_chunks。
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { retrieveRelevantChunks } from '@/src/lib/retrieval';

interface RetrieveSuccessResponse {
  query: string;
  results: Array<{
    id: string;
    content: string;
    documentId: string;
    knowledgeBaseId: string;
    similarity: number;
  }>;
}

interface RetrieveErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RetrieveSuccessResponse | RetrieveErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const body = req.body as { query?: string; knowledgeBaseId?: string; topK?: number };
  const query = body.query?.trim();

  if (!query) {
    return res.status(400).json({ error: '缺少查询文本 query' });
  }

  try {
    const chunks = await retrieveRelevantChunks(query, {
      knowledgeBaseId: body.knowledgeBaseId,
      topK: body.topK ?? 5,
    });

    return res.status(200).json({
      query,
      results: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        knowledgeBaseId: chunk.knowledgeBaseId,
        fileName: chunk.fileName,
        similarity: 1 - chunk.distance,
      })),
    });
  } catch (error) {
    console.error('Retrieve API error:', error);
    const message = error instanceof Error ? error.message : '检索失败';
    return res.status(500).json({ error: message });
  }
}
