import type { Metadata } from "next";
import { MotionHome } from "../motion/motion-home";

export const metadata:Metadata={title:"鲨保保 SharkBoom · 鲨鲨的航海世界",description:"一只鲨，一起出海。探索鲨保保的立体航海世界与跨境保险方案。"};
export default function SculptedPage(){return <MotionHome immersive/>;}
