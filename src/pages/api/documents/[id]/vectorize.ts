/**
 * @file pages/api/documents/[id]/vectorize.ts
 * @description 文档向量化触发接口：为指定文档下所有未向量化的 chunk 生成 embedding。
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { vectorizeDocument } from '@/src/lib/vectorize';

interface VectorizeSuccessResponse {
  documentId: string;
  vectorizedChunks: number;
}

interface VectorizeErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VectorizeSuccessResponse | VectorizeErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const { id } = req.query;
  const documentId = Array.isArray(id) ? id[0] : id;

  if (!documentId) {
    return res.status(400).json({ error: '缺少文档 ID' });
  }

  try {
    const vectorizedChunks = await vectorizeDocument(documentId);
    return res.status(200).json({ documentId, vectorizedChunks });
  } catch (error) {
    console.error('Vectorize API error:', error);
    const message = error instanceof Error ? error.message : '向量化失败';
    return res.status(500).json({ error: message });
  }
}
