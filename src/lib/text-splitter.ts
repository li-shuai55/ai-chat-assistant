/**
 * @file text-splitter.ts
 * @description 文本切分工具：按固定长度与重叠窗口把长文本切成多个 chunk。
 */

/** 默认切分参数 */
export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * 按固定长度切分文本，相邻 chunk 之间有重叠，避免语义断裂。
 *
 * @param text - 待切分的原始文本
 * @param chunkSize - 每个 chunk 的最大字符数
 * @param chunkOverlap - 相邻 chunk 之间的重叠字符数
 * @returns 切分后的文本块数组
 */
export function splitText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  if (chunkSize <= 0) throw new Error('chunkSize 必须大于 0');
  if (chunkOverlap < 0) throw new Error('chunkOverlap 不能为负数');
  if (chunkOverlap >= chunkSize) throw new Error('chunkOverlap 必须小于 chunkSize');

  const chunks: string[] = [];
  let start = 0;
  const step = chunkSize - chunkOverlap;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start += step;
  }

  return chunks;
}
