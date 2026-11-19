import type { Metadata } from "next";
import { headers } from "next/headers";
import { sitePath } from "./site-path";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  let origin = process.env.GITHUB_PAGES_ORIGIN;
  if (!origin) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
    origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  }
  const image = `${origin}${sitePath("/og.png")}`;
  return {
    title: "鲨保保 SharkBoom · 跨境保险与保函服务",
    description: "为中国跨境卖家提供产品责任险、国际货运险、TRO 侵权诉讼保险、意大利 VIES 保函和贸易信用险咨询与服务对接。",
    robots: { index: process.env.STANDALONE_SITE === "true", follow: process.env.STANDALONE_SITE === "true" },
    alternates: process.env.STANDALONE_SITE === "true" ? {canonical: `${origin}/`} : undefined,
    icons: { icon: sitePath("/logo.png") },
    openGraph: { title: "鲨保保 SharkBoom", description: "跨境电商保险与保函服务", type: "website", images: [{ url: image, alt: "鲨保保跨境电商保险与保函服务" }] },
    twitter: { card: "summary_large_image", title: "鲨保保 SharkBoom", images: [image] },
  };
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
