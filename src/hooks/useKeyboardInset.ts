'use client';

/**
 * @file useKeyboardInset.ts
 * @description 移动端虚拟键盘遮挡适配 Hook：返回底部需要让出的键盘高度（px）
 */
import { useState, useEffect } from 'react';

/**
 * 计算底部被虚拟键盘遮挡的高度。
 *
 * 背景：h-dvh 只跟随地址栏显隐，不响应 iOS 虚拟键盘（布局视口高度不变，
 * 键盘直接覆盖页面底部）；而 viewport 的 interactive-widget=resizes-content
 * 仅对 Android Chrome 生效。因此需要 visualViewport 兜底：
 *   inset = 布局视口高度 - 可视视口高度 - 可视视口顶部偏移
 * - iOS 键盘弹出：visualViewport.height 收缩，inset ≈ 键盘高度；
 * - Android（resizes-content）：布局视口已同步收缩，inset ≈ 0，不会重复叠加；
 * - 桌面端：恒为 0。
 *
 * 阈值 120px：过滤地址栏显隐（约 44~60px）造成的抖动，
 * 只在键盘真正占据屏高时生效。
 *
 * @param threshold 判定键盘弹出的最小高度阈值
 * @returns 键盘遮挡高度（px），未弹出时返回 0
 */
export function useKeyboardInset(threshold = 120): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(diff > threshold ? diff : 0);
    };

    update();
    // 键盘弹出/收起、地址栏显隐、页面缩放都会触发 visualViewport resize/scroll
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [threshold]);

  return inset;
}
