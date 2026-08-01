import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// highlight.js 代码高亮主题：放在 layout 中作为普通 CSS import，
// 避免在 Tailwind 入口 CSS 里用 @import 触发 Turbopack/PostCSS worker 偶发崩溃
import "highlight.js/styles/github-dark.css";
import "./globals.css";

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
 * 根布局：加载 Geist 字体、注入全局样式与站点 metadata
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
