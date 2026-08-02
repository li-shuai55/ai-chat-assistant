/**
 * @file ThemeInitScript.tsx
 * @description 同步内联脚本组件：在浏览器解析 HTML 时立即执行，
 * 于首次绘制前根据 localStorage 或系统偏好设置 html 的 data-theme 属性，
 * 从而避免主题切换出现 FOUC（白屏/闪黑）。
 */
export function ThemeInitScript() {
  const initScript = `
    (function () {
      try {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // 用户明确保存过主题则优先使用；否则跟随系统偏好；兜底为浅色。
        if (stored === 'dark' || (!stored && prefersDark)) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } catch (e) {
        // localStorage 不可用（如隐私模式）时静默回退为浅色。
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: initScript }} />;
}
