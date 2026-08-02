'use client';

/**
 * @file useStreamingText.ts
 * @description 流式文本渲染优化 Hook。
 *
 * 将实时增长的流式文本拆分为“已定型（committedText）”与“待定（pendingText）”两部分：
 * - 已定型文本：到达 Markdown 结构安全边界，使用完整 Markdown + 语法高亮渲染（低频更新）。
 * - 待定文本：尚未到达安全边界，使用轻量纯文本渲染（高频更新）。
 *
 * 通过 requestAnimationFrame 批量合并高频 token 更新，避免每次 token 到达都触发
 * react-markdown + rehype-highlight 的全量重解析，从而显著降低长文本流式渲染的卡顿。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 流式文本拆分选项。
 */
interface UseStreamingTextOptions {
  /** 当前完整文本（来自 AI SDK UI Message 的拼接结果） */
  text: string;
  /** 是否仍处于流式生成中 */
  isStreaming: boolean;
}

/**
 * 流式文本拆分结果。
 */
interface UseStreamingTextResult {
  /** 已定型文本：可安全进行 Markdown 渲染 */
  committedText: string;
  /** 待定文本：尚未到达安全边界，使用纯文本轻量渲染 */
  pendingText: string;
}

/**
 * 寻找文本中的安全拆分边界。
 *
 * 策略：
 * 1. 文本较短时整体作为待定，避免频繁切换带来的开销；
 * 2. 不拆分代码围栏，避免代码块被截断导致高亮错误；
 * 3. 优先在段落边界（空行）后拆分；
 * 4. 代码围栏关闭后是安全边界；
 * 5. 找不到安全边界时返回 0，表示当前全部作为待定文本。
 *
 * @param text 当前完整文本
 * @returns 安全边界索引，索引之前的文本可作为已定型文本
 */
function findSafeBoundary(text: string): number {
  // 文本较短时整体作为待定，避免频繁切换带来的开销
  if (text.length < 100) {
    return 0;
  }

  let insideCodeFence = false;
  let lastBoundary = 0;
  let lineStart = 0;
  let lastNonEmptyLineEnd = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\n') {
      continue;
    }

    const line = text.slice(lineStart, i);

    // 代码围栏切换：进入或退出代码块
    if (line.trimStart().startsWith('```')) {
      insideCodeFence = !insideCodeFence;
      if (!insideCodeFence) {
        // 围栏关闭位置是安全边界
        lastBoundary = i + 1;
      }
    } else if (!insideCodeFence) {
      if (line.trim() === '') {
        // 空行表示段落边界，把上一个非空行结束的位置作为边界
        if (lastNonEmptyLineEnd > 0) {
          lastBoundary = i + 1;
        }
      } else {
        lastNonEmptyLineEnd = i + 1;
      }
    }

    lineStart = i + 1;
  }

  return lastBoundary;
}

/**
 * 流式文本渲染优化 Hook。
 *
 * @param options 拆分选项
 * @returns 已定型文本与待定文本
 */
export function useStreamingText({
  text,
  isStreaming,
}: UseStreamingTextOptions): UseStreamingTextResult {
  const [committedText, setCommittedText] = useState(text);
  const [pendingText, setPendingText] = useState('');

  // 使用 ref 保存最新值，避免 requestAnimationFrame 回调形成闭包陷阱
  const textRef = useRef(text);
  const streamingRef = useRef(isStreaming);
  const rafRef = useRef<number | null>(null);

  /**
   * 调度一次状态更新。
   * 使用 requestAnimationFrame 将高频 token 更新合并为每帧一次，减少状态更新次数。
   */
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const currentText = textRef.current;
      const currentStreaming = streamingRef.current;

      // 流式结束时全部提交；流式中只提交到安全边界
      const boundary = currentStreaming ? findSafeBoundary(currentText) : currentText.length;
      const newCommitted = currentText.slice(0, boundary);
      const newPending = currentText.slice(boundary);

      setCommittedText(newCommitted);
      setPendingText(newPending);
    });
  }, []);

  useEffect(() => {
    const streamingStarted = isStreaming && !streamingRef.current;

    textRef.current = text;
    streamingRef.current = isStreaming;

    // 流式重新开始（如重新生成）时立即重置，避免旧内容闪烁
    if (streamingStarted) {
      setCommittedText('');
      setPendingText('');
    }

    scheduleUpdate();
  }, [text, isStreaming, scheduleUpdate]);

  // 组件卸载时取消未执行的 requestAnimationFrame，防止内存泄漏
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return { committedText, pendingText };
}
