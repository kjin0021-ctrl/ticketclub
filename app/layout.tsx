import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const englishFont = DM_Sans({
  variable: "--font-english",
  subsets: ["latin"],
  display: "swap",
});

const chineseFont = Noto_Sans_SC({
  variable: "--font-chinese",
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "TicketClub 票来",
  description: "开源、自部署的艺人行程与追星旅行决策助手。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${englishFont.variable} ${chineseFont.variable}`}>
        {children}
      </body>
    </html>
  );
}

