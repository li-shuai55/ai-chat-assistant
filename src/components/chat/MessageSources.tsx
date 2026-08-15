'use client';

/**
 * @file MessageSources.tsx
 * @description 单条 AI 消息下方的参考来源面板：
 * 根据用户问题调用 /api/retrieve 检索相关文档片段，并以可折叠列表展示。
 */
import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface Source {
  id: string;
  content: string;
  documentId: string;
  knowledgeBaseId: string;
  fileName: string;
  similarity: number;
}

interface MessageSourcesProps {
  /** 用于检索的用户问题 */
  query: string;
  /** 可选：限定知识库 ID */
  knowledgeBaseId?: string;
}

/**
 * AI 回答下方的参考来源组件。
 * 挂载时自动发起检索，结果以折叠面板形式展示，避免打断正文阅读。
 */
export function MessageSources({ query, knowledgeBaseId }: MessageSourcesProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, knowledgeBaseId, topK: 5 }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`检索失败：${res.status}`);
        const data = (await res.json()) as { results?: Source[] };
        if (!cancelled) setSources(data.results ?? []);
      })
      .catch((err) => {
        console.error('Failed to load message sources:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, knowledgeBaseId]);

  if (loading) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">正在查找参考来源…</p>
    );
  }

  if (sources.length === 0) return null;

  return (
    <div className="mt-2 max-w-[85%] md:max-w-[75%]">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex items-center gap-1 rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-expanded={expanded}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>{sources.length} 个参考来源</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-sm">
          {sources.map((source, index) => (
            <div key={source.id} className="text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  [{index + 1}] {source.fileName}
                </span>
                <span className="text-muted-foreground">
                  相似度 {(source.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-muted-foreground">
                {source.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
