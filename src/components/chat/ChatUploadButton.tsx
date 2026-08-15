'use client';

/**
 * @file ChatUploadButton.tsx
 * @description 聊天输入框左侧的「+」上传按钮：支持选择文件并上传到指定知识库。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface KnowledgeBase {
  id: string;
  name: string;
}

interface ChatUploadButtonProps {
  /** 上传成功后的回调 */
  onUploaded?: () => void;
}

/**
 * 聊天输入框左侧的扩展菜单按钮。
 * 当前仅提供"上传文件"入口，选择文件后需指定知识库再上传。
 */
export function ChatUploadButton({ onUploaded }: ChatUploadButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isCreatingKb, setIsCreatingKb] = useState(false);

  // 加载知识库列表
  const loadKnowledgeBases = useCallback(() => {
    fetch('/api/knowledge-bases')
      .then((res) => res.json())
      .then((data) => {
        const list: KnowledgeBase[] = data.knowledgeBases ?? [];
        setKnowledgeBases(list);
        if (list.length > 0 && !selectedKbId) {
          setSelectedKbId(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load knowledge bases:', err);
        setMessage('获取知识库失败');
      });
  }, [selectedKbId]);

  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  // 点击菜单外部自动关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  /** 点击"上传文件"：关闭菜单并触发文件选择 */
  const handleUploadClick = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  /** 创建默认知识库 */
  const handleCreateDefaultKb = async () => {
    setIsCreatingKb(true);
    setMessage(null);
    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '默认知识库' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? '创建知识库失败');
      }
      const newKb: KnowledgeBase = data.knowledgeBase;
      setKnowledgeBases([newKb]);
      setSelectedKbId(newKb.id);
      setMenuOpen(false);
      // 自动触发文件选择
      setTimeout(() => fileInputRef.current?.click(), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建知识库失败';
      setMessage(msg);
    } finally {
      setIsCreatingKb(false);
    }
  };

  /** 文件选择后打开知识库确认对话框 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setDialogOpen(true);
    setMessage(null);
    // 允许重复选择同一文件
    e.target.value = '';
  };

  /** 执行上传 */
  const handleConfirmUpload = async () => {
    if (!pendingFile || !selectedKbId) return;

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('knowledgeBaseId', selectedKbId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '上传失败');
      }

      setMessage(`上传成功：${data.totalChunks} 个切片`);
      setDialogOpen(false);
      setPendingFile(null);
      onUploaded?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败';
      setMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  /** 取消上传对话框 */
  const handleCancel = () => {
    setDialogOpen(false);
    setPendingFile(null);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:w-9"
          aria-label="更多操作"
        >
          <Plus className={cn('h-5 w-5 transition-transform', menuOpen && 'rotate-45')} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
            {knowledgeBases.length === 0 ? (
              <button
                type="button"
                onClick={handleCreateDefaultKb}
                disabled={isCreatingKb}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {isCreatingKb ? '创建中...' : '创建默认知识库'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Upload className="h-4 w-4" />
                上传文件
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 知识库选择对话框 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-medium text-foreground">上传文件</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">
              {pendingFile?.name}
            </p>

            <label htmlFor="kb-select" className="mb-1 block text-sm text-muted-foreground">
              选择知识库
            </label>
            <select
              id="kb-select"
              value={selectedKbId}
              onChange={(e) => setSelectedKbId(e.target.value)}
              className="mb-4 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>

            {message && (
              <p className="mb-3 text-sm text-destructive">{message}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {isUploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
