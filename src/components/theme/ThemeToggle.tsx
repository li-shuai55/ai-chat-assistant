'use client';

/**
 * @file ThemeToggle.tsx
 * @description 主题切换按钮：点击在深色 / 浅色模式之间切换。
 *
 * 性能与一致性设计：
 * - 图标显隐完全由 CSS 的 dark: 变体控制（基于 <html data-theme>）：
 *   同时渲染太阳与月亮两个图标，按主题用 display 切换。
 *   无需任何 JS state 与 effect，从根上规避了：
 *   ① hydration 阶段图标与服务端渲染不一致；
 *   ② effect 内 setState 导致的级联重渲染；
 *   ③ 布局跳动（CLS）。
 * - 主题读写统一委托 useTheme Hook：切换仅更新 <html data-theme>，
 *   所有颜色由 CSS 变量驱动，成本极低。
 */
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTheme } from '@/src/hooks/useTheme';

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded p-2',
        'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      )}
      aria-label="切换主题"
    >
      {/* 深色模式显示太阳（提示可切回浅色），浅色模式显示月亮；
          纯 CSS 显隐，无 hydration 错位 */}
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </button>
  );
}
