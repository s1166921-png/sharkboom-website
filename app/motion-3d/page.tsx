import type { Metadata } from "next";
import { MotionHome } from "../motion/motion-home";
import {WORLD_MODEL} from "./model-assets";
import {sitePath} from "../site-path";

export const metadata:Metadata={title:"鲨保保 SharkBoom · 跨境保险与保函服务",description:"专注中国跨境卖家，提供产品责任险、国际货运险、TRO 侵权诉讼保险、意大利 VIES 保函和贸易信用险咨询与服务对接。"};
export default function SculptedPage(){return <><link rel="preload" as="fetch" href={sitePath(WORLD_MODEL)} crossOrigin="anonymous" fetchPriority="high"/><MotionHome/></>;}
