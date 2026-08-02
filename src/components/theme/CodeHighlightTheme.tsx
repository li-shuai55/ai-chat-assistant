'use client';

/**
 * @file CodeHighlightTheme.tsx
 * @description 监听 html 的 data-theme 属性，动态切换 highlight.js 代码高亮 CSS。
 * 代码块通常不在首屏，因此不会导致 FOUC；切换到新主题时高亮样式会跟随变化。
 */
import { useEffect } from 'react';

const HIGHLIGHT_CSS = {
  light: '/highlight/github.css',
  dark: '/highlight/github-dark.css',
} as const;

export function CodeHighlightTheme() {
  useEffect(() => {
    const apply = () => {
      const theme =
        (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
      const href = HIGHLIGHT_CSS[theme];

      let link = document.getElementById('hljs-theme') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = 'hljs-theme';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = href;
    };

    apply();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          apply();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
