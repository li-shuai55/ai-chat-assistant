'use client';

/**
 * @file ChatError.tsx
 * @description 聊天错误提示组件：根据错误类型展示友好的中文提示与重试入口
 */
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ChatErrorProps {
  /** useChat 返回的错误对象 */
  error: Error;
  /** 重试回调：存在时展示重试按钮 */
  onRetry?: () => void;
  /** 是否正在重试：用于禁用按钮并展示旋转图标 */
  isRetrying?: boolean;
}

/**
 * 根据错误信息推断错误标题。
 * 优先匹配关键词，命中则返回对应的中文标题；未命中时兜底为“请求出错”。
 */
function getErrorTitle(error: Error): string {
  const message = error.message.toLowerCase();

  // 网络类错误：fetch 失败、断网等
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('abort') ||
    message.includes('timeout')
  ) {
    return '网络连接失败';
  }

  // 认证/授权类错误：密钥无效、权限不足
  if (
    message.includes('api 密钥') ||
    message.includes('密钥') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return 'API 密钥错误';
  }

  // 限流类错误
  if (
    message.includes('过于频繁') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return '请求过于频繁';
  }

  // 服务端/模型不可用
  if (
    message.includes('不可用') ||
    message.includes('internal server error') ||
    message.includes('500')
  ) {
    return '服务暂时不可用';
  }

  return '请求出错';
}

/**
 * 错误提示组件：左侧错误图标，中间为标题与详情，下方可选重试按钮。
 * 配色使用 error-* 语义化 token：深浅色主题下均为醒目的红色系，
 * 且与背景保持足够对比度。
 */
export function ChatError({ error, onRetry, isRetrying }: ChatErrorProps) {
  return (
    <div className="rounded-lg border border-error-border bg-error-bg px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-muted" />
        <div className="flex-1">
          <p className="text-sm font-medium text-error-text">{getErrorTitle(error)}</p>
          <p className="mt-1 text-sm text-error-muted">{error.message}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 flex items-center gap-1 rounded-md bg-error-border/40 px-3 py-1.5 text-xs font-medium text-error-text transition-colors hover:bg-error-border/60 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="重试"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')}
              />
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
