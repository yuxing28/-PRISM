import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://decision-website.vercel.app";
const siteName = "智镜 PRISM";
const siteDescription = "防骗避坑、买房置业、化解家庭分歧——让 AI 帮你做一次「决策体检」。已为 10,000+ 家庭提供参考。";
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
        {turnstileSiteKey && (
          <>
            <script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
              async={false}
              defer={false}
            />
            <Script id="turnstile-init" strategy="afterInteractive">
              {`
                window.__turnstileToken = '';
                window.__turnstileWidgetId = '';
                window.onTurnstileLoad = function() {
                  var el = document.getElementById('turnstile-container');
                  if (el && window.turnstile) {
                    window.__turnstileWidgetId = window.turnstile.render(el, {
                      sitekey: '${turnstileSiteKey}',
                      action: 'chat',
                      appearance: 'interaction-only',
                      execution: 'execute',
                      callback: function(token) { window.__turnstileToken = token; },
                      'expired-callback': function() { window.__turnstileToken = ''; },
                      'error-callback': function() { window.__turnstileToken = ''; }
                    });
                  }
                };
                window.getTurnstileToken = function() {
                  if (!window.turnstile || !window.__turnstileWidgetId) return Promise.resolve('');
                  var cur = window.turnstile.getResponse(window.__turnstileWidgetId);
                  if (cur) {
                    window.__turnstileToken = cur;
                    return Promise.resolve(cur);
                  }
                  return new Promise(function(resolve) {
                    var done = false;
                    var check = setInterval(function() {
                      if (window.__turnstileToken) { done = true; clearInterval(check); resolve(window.__turnstileToken); }
                    }, 100);
                    setTimeout(function() { if (!done) { clearInterval(check); resolve(''); } }, 8000);
                    try { window.turnstile.execute(window.__turnstileWidgetId); } catch(e) { clearInterval(check); resolve(''); }
                  });
                };
              `}
            </Script>
            <div
              id="turnstile-container"
              style={{ position: 'fixed', bottom: '12px', right: '12px', zIndex: 50, opacity: 0.85 }}
              aria-hidden="true"
            />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
