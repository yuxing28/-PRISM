import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as requested for modern look
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multi-Dimensional Decision Assistant",
  description: "AI-powered structured decision making tool",
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
