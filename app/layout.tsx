import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "鲨保保 SharkBoom · 官网设计预览",
    description: "为中国跨境卖家提供保险与保函服务。探索鲨鲨航海 3D 与蓝白专业、深海科技、温暖编辑、环球护航五种首页设计。",
    robots: { index: false, follow: false },
    icons: { icon: "/logo.png" },
    openGraph: { title: "鲨保保 SharkBoom", description: "跨境电商保险与保函服务 · 官网设计预览", type: "website", images: [{ url: image, alt: "鲨保保跨境电商保险与保函服务" }] },
    twitter: { card: "summary_large_image", title: "鲨保保 SharkBoom", images: [image] },
  };
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
