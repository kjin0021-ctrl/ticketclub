import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "TicketClub 票来",
    description: "开源、自部署的真实艺人行程追踪与追星旅行决策助手。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "TicketClub 票来", description: "只确认真实行程：公开来源 → 用户确认 → 旅行计划", images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "TicketClub 票来 — 只确认真实行程" }] },
    twitter: { card: "summary_large_image", title: "TicketClub 票来", description: "只确认真实行程：公开来源 → 用户确认 → 旅行计划", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${englishFont.variable} ${chineseFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
