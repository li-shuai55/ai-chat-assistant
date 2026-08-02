import type { Metadata } from "next";
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
