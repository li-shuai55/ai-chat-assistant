import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeInitScript } from "@/src/components/theme/ThemeInitScript";
import { CodeHighlightTheme } from "@/src/components/theme/CodeHighlightTheme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat Assistant",
  description: "A ChatGPT-like AI chat assistant with multi-session support",
};

/**
 * viewport 元信息（移动端适配）：
 * - width/initialScale：确保移动端页面按设备宽度渲染、不放大；
 * - viewportFit: "cover"：页面延伸到刘海屏安全区，使 env(safe-area-inset-*)
 *   返回真实值——否则 iOS 上安全区常量恒为 0，底部输入框的安全区 padding 不生效；
 * - interactiveWidget: "resizes-content"：Android Chrome 键盘弹出时收缩布局视口，
 *   配合 h-dvh 让输入框自动弹起，不被键盘遮挡（iOS 走 useKeyboardInset 方案）；
 * - themeColor：控制移动端浏览器状态栏/地址栏底色，先给出浅色初始值，
 *   随后由 ThemeInitScript 与 useTheme 在主题确定后同步为实际主题色
 *   （避免依赖 prefers-color-scheme 的手动切换场景下状态栏与页面不一致）。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

/**
 * 根布局：加载 Geist 字体、注入全局样式与站点 metadata
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning：内联脚本会修改 html 属性，允许服务端/客户端差异。
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        {/* 仅在客户端运行，负责根据当前主题切换 highlight.js 代码高亮 CSS。 */}
        <CodeHighlightTheme />
      </body>
    </html>
  );
}
