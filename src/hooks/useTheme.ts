'use client';

/**
 * @file useTheme.ts
 * @description 主题管理 Hook：封装「深色 / 浅色」模式的读取、切换与系统偏好监听。
 *
 * 设计要点（性能与一致性）：
 * - 单一数据源：主题状态始终由 <html data-theme> 持有，React state 只是该值的快照，
 *   避免多处状态互相不同步。
 * - 低成本切换：所有颜色均由 CSS 变量驱动（见 globals.css），切换主题仅更新一次
 *   html 属性并触发一次重绘，不需要重渲染整棵组件树。
 * - 无 FOUC：首帧前的初始化由 ThemeInitScript 完成，本 Hook 挂载时直接同步读取 DOM。
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** localStorage 存储键：用于跨会话记忆用户选择 */
const THEME_STORAGE_KEY = 'theme';

/** 移动端浏览器状态栏底色（与 globals.css 中 --background 一致） */
const THEME_COLOR_LIGHT = '#ffffff';
const THEME_COLOR_DARK = '#0a0a0a';

/**
 * 同步移动端浏览器状态栏底色：<meta name="theme-color"> 在服务端渲染时
 * 只能给出浅色初始值，这里在切换主题时同步更新，保证状态栏与页面一致。
 */
function syncThemeColor(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}

/**
 * 读取当前主题：优先取 <html> 上的 data-theme 属性。
 * 该属性由 ThemeInitScript 在浏览器首次绘制前写入，因此此处拿到的一定是最终生效值。
 */
function getThemeFromDom(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * 主题 Hook。
 *
 * @returns { theme } 当前主题；{ setTheme } 显式设置主题；
 *          { toggleTheme } 在深浅色间切换。
 */
export function useTheme() {
  // 初始值直接读 DOM（而非写死），保证与初始化脚本结果一致，避免 hydration 后闪烁。
  // 惰性初始化只在首次渲染执行一次，SSR 阶段返回 light 仅作为占位（由挂载守卫规避图标错位）。
  const [theme, setThemeState] = useState<Theme>(getThemeFromDom);

  /**
   * 应用主题：写入 html 属性（驱动 CSS 变量）并持久化到 localStorage。
   * 用 useCallback 稳定引用，保证依赖它的 effect / memo 不被反复触发。
   */
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    syncThemeColor(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage 不可用（如隐私模式）时静默忽略，本次会话内仍生效
    }
    setThemeState(next);
  }, []);

  /** 切换主题：基于 DOM 当前值取反，避免依赖可能过期的 state 快照 */
  const toggleTheme = useCallback(() => {
    setTheme(getThemeFromDom() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  /**
   * 监听系统深色模式变化：仅当用户从未显式选择过主题时跟随系统，
   * 与 ThemeInitScript 的初始化逻辑保持一致，避免覆盖用户的明确选择。
   */
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      const hasStoredPreference = (() => {
        try {
          return localStorage.getItem(THEME_STORAGE_KEY) !== null;
        } catch {
          return false;
        }
      })();
      if (!hasStoredPreference) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
