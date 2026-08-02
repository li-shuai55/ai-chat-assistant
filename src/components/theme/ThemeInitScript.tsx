/**
 * @file ThemeInitScript.tsx
 * @description 同步内联脚本组件：在浏览器解析 HTML 时立即执行，
 * 于首次绘制前根据 localStorage 或系统偏好设置 html 的 data-theme 属性，
 * 从而避免主题切换出现 FOUC（白屏/闪黑）。
 *
 * 同时同步 <meta name="theme-color">（移动端浏览器状态栏底色）：
 * 由于 viewport 元信息在服务端渲染时无法感知最终主题，这里在首帧前
 * 将状态栏颜色修正为与实际主题一致，避免浅色状态下出现深色状态栏。
 */

/** 主题对应的移动端状态栏底色（与 globals.css 中 --background 一致） */
const THEME_COLOR_LIGHT = '#ffffff';
const THEME_COLOR_DARK = '#0a0a0a';

export function ThemeInitScript() {
  const initScript = `
    (function () {
      try {
        var stored = localStorage.getItem('theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // 用户明确保存过主题则优先使用；否则跟随系统偏好；兜底为浅色。
        var theme;
        if (stored === 'dark' || (!stored && prefersDark)) {
          theme = 'dark';
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          theme = 'light';
          document.documentElement.setAttribute('data-theme', 'light');
        }
        // 同步移动端浏览器状态栏底色，使其与页面主题一致
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', theme === 'dark' ? '${THEME_COLOR_DARK}' : '${THEME_COLOR_LIGHT}');
        }
      } catch (e) {
        // localStorage 不可用（如隐私模式）时静默回退为浅色。
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: initScript }} />;
}
