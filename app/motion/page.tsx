import type { Metadata } from "next";
import { MotionHome } from "./motion-home";

export const metadata: Metadata = {
  title: "鲨保保 SharkBoom · 环球护航动态版",
  description: "让生意，跨越山海。探索鲨保保跨境保险与保函服务。",
};

export default function MotionPage() {
  return <MotionHome />;
}
