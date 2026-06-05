import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://decision-website.vercel.app";
const siteName = "智镜 PRISM";
const siteDescription = "防骗避坑、买房置业、化解家庭分歧——让 AI 帮你做一次「决策体检」。已为 10,000+ 家庭提供参考。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - 你的 AI 理性决策外脑`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: ["AI决策助手", "决策分析", "防骗", "买房分析", "职业选择", "DeepSeek", "智镜", "PRISM"],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  applicationName: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName,
    title: `${siteName} - 你的 AI 理性决策外脑`,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - 你的 AI 理性决策外脑`,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo-light.png", type: "image/png" },
    ],
    apple: "/logo-light.png",
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: siteUrl,
  },
  category: "productivity",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0EA5E9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden selection:bg-sky-100 selection:text-sky-900"
        )}
      >
        {children}
      </body>
    </html>
  );
}
