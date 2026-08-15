/**
 * @file document-parser.ts
 * @description 文档内容解析：支持 PDF、TXT、Markdown 等常见格式。
 */
import { PDFParse } from 'pdf-parse';

/** 支持的 MIME 类型或文件扩展名集合 */
export const SUPPORTED_DOCUMENT_TYPES = new Set([
  // PDF
  'application/pdf',
  // 纯文本
  'text/plain',
  // Markdown 通常按 text/plain 或 text/markdown 上传
  'text/markdown',
  'text/x-markdown',
]);

/** 根据文件扩展名推断 MIME 类型，用于浏览器 MIME 识别不准时的兜底 */
export function inferMimeTypeFromExtension(fileName: string): string | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    default:
      return undefined;
  }
}

/** 判断文件类型是否受支持 */
export function isSupportedDocumentType(mimeType: string): boolean {
  return SUPPORTED_DOCUMENT_TYPES.has(mimeType);
}

/**
 * 解析文件缓冲区为纯文本。
 * @param buffer - 文件二进制内容
 * @param mimeType - 文件 MIME 类型
 * @returns 解析后的纯文本
 * @throws 不支持的文件类型或解析失败时抛出错误
 */
export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  if (!isSupportedDocumentType(mimeType)) {
    throw new Error(`不支持的文件类型：${mimeType}，目前仅支持 PDF、TXT、MD`);
  }

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? '';
    } finally {
      await parser.destroy();
    }
  }

  // TXT / Markdown 直接按 UTF-8 解码
  return buffer.toString('utf-8');
}
