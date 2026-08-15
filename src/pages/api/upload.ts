/**
 * @file pages/api/upload.ts
 * @description 文件上传与解析接口（Pages Router）。
 *
 * 使用 multer 处理 multipart/form-data，解析 PDF/TXT/MD 后写入 Document 与 DocumentChunk。
 * 当前仅填充文本内容，embedding 字段留空，由后续向量化任务补充。
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { parseDocument, isSupportedDocumentType, inferMimeTypeFromExtension } from '@/src/lib/document-parser';
import { splitText } from '@/src/lib/text-splitter';
import { prisma } from '@/src/lib/db';

// 禁用 Next.js 默认 body parser，让 multer 处理 multipart 流
export const config = {
  api: {
    bodyParser: false,
  },
};

/** multer 配置：文件直接读入内存，不落地磁盘 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // 单个文件最大 20MB
    fileSize: 20 * 1024 * 1024,
  },
});

/** 将 multer 中间件包装为 Promise，适配 async handler */
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args: any[]) => any
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fn as any)(req, res, (result: unknown) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve(result);
    });
  });
}

/** 上传请求体中携带的字段 */
interface UploadRequestBody {
  knowledgeBaseId?: string;
}

/** 统一错误响应结构 */
interface UploadErrorResponse {
  error: string;
}

/** 成功响应结构 */
interface UploadSuccessResponse {
  documentId: string;
  fileName: string;
  totalChunks: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadSuccessResponse | UploadErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  try {
    await runMiddleware(req, res, upload.single('file'));
  } catch (error) {
    const message = error instanceof Error ? error.message : '文件上传失败';
    return res.status(400).json({ error: message });
  }

  // multer 解析完成后，file 与 body 字段会挂载到 req 上
  const file = (req as NextApiRequest & { file?: Express.Multer.File }).file;
  const body = req.body as UploadRequestBody | undefined;
  const knowledgeBaseId = body?.knowledgeBaseId;

  if (!file) {
    console.warn('[Upload] 400: 缺少 file 字段');
    return res.status(400).json({ error: '缺少文件，请通过 form-data 的 file 字段上传' });
  }

  if (!knowledgeBaseId?.trim()) {
    console.warn('[Upload] 400: 缺少 knowledgeBaseId，文件名:', file.originalname);
    return res.status(400).json({ error: '缺少知识库 ID' });
  }

  // 部分浏览器/系统可能把 TXT/Markdown/PDF 识别为 application/octet-stream，
  // 这里按扩展名做一次兜底，避免合法文件因 MIME 类型不准被拒绝。
  const detectedMimeType = isSupportedDocumentType(file.mimetype)
    ? file.mimetype
    : inferMimeTypeFromExtension(file.originalname);

  if (!detectedMimeType || !isSupportedDocumentType(detectedMimeType)) {
    console.warn('[Upload] 400: 不支持的文件类型:', file.mimetype, '文件名:', file.originalname);
    return res.status(400).json({
      error: `不支持的文件类型：${file.mimetype}，目前仅支持 PDF、TXT、MD`,
    });
  }

  try {
    // 1. 校验知识库存在
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });
    if (!knowledgeBase) {
      return res.status(404).json({ error: '知识库不存在' });
    }

    // 2. 解析文档文本
    let text: string;
    try {
      text = await parseDocument(file.buffer, detectedMimeType);
    } catch (error) {
      const message = error instanceof Error ? error.message : '文档解析失败';
      return res.status(400).json({ error: message });
    }

    // 3. 切分文本
    const chunks = splitText(text);

    // 4. 创建 Document 记录
    const document = await prisma.document.create({
      data: {
        knowledgeBaseId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'PROCESSING',
        totalChunks: chunks.length,
      },
    });

    // 5. 批量创建 DocumentChunk 记录
    if (chunks.length > 0) {
      await prisma.documentChunk.createMany({
        data: chunks.map((content, index) => ({
          documentId: document.id,
          knowledgeBaseId,
          chunkIndex: index,
          content,
        })),
      });
    }

    // 6. 标记为已完成
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'COMPLETED' },
    });

    return res.status(200).json({
      documentId: document.id,
      fileName: document.fileName,
      totalChunks: chunks.length,
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    const message = error instanceof Error ? error.message : '上传处理失败';
    return res.status(500).json({ error: message });
  }
}
