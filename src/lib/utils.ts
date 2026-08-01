/**
 * @file utils.ts
 * @description 通用工具函数：className 合并、ID 生成、时间格式化、文本截断
 */

/** 合并 className：过滤 falsy 值后以空格拼接 */
export function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

/** 生成唯一 ID：优先 crypto.randomUUID，非安全环境兜底为时间戳 + 随机串 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 时间戳格式化：今天显示时分，昨天显示"昨天"，更早显示 月/日 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

/** 超长文本截断，末尾加省略号 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
