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
    title: "鲨保保 SharkBoom · 官网设计预览",
    description: "为中国跨境卖家提供保险与保函服务。探索蓝白专业、深海科技、温暖编辑与鲨鲨航海 3D 四种首页设计。",
    robots: { index: false, follow: false },
    icons: { icon: sitePath("/logo.png") },
    openGraph: { title: "鲨保保 SharkBoom", description: "跨境电商保险与保函服务 · 官网设计预览", type: "website", images: [{ url: image, alt: "鲨保保跨境电商保险与保函服务" }] },
    twitter: { card: "summary_large_image", title: "鲨保保 SharkBoom", images: [image] },
  };
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
