import { ArrowUpRight, ListChecks, Radar, Scale } from "lucide-react";
import { externalServiceUrl, serviceLinks } from "./service-links";
import f from "./intake.module.css";

export function ExternalServices({ kind, onContact }: { kind: "risk" | "ai"; onContact: () => void }) {
  const aiUrl = externalServiceUrl(serviceLinks.aiLawyer);
  return <div className={f.servicePanel}>
    <span className={f.kicker}>{kind === "risk" ? "TRO / PRE-INSURANCE CHECK" : "TRO / AI LEGAL SERVICE"}</span>
    <h2>{kind === "risk" ? "保前侵权检测" : "TRO应对-AI律师服务"}</h2>
    {kind === "risk" ? <>
      <p>通过塞贝风控系统了解店铺风险，按需要选择风险数量概览或按 ASIN 自费检测。</p>
      <div className={f.serviceChoices}>{[
        { title: "店铺风险概览", icon: Radar, text: "查看高风险、低风险数量。具体可见信息与开放范围以风控系统为准。", url: serviceLinks.riskOverview },
        { title: "按 ASIN 自费检测", icon: ListChecks, text: "按 ASIN 计费，检测范围、价格及服务内容在外部系统确认。", url: serviceLinks.asinDetection },
      ].map(item => { const url = externalServiceUrl(item.url); return <div key={item.title}><item.icon size={26}/><h3>{item.title}</h3><p>{item.text}</p>{url ? <a href={url} target="_blank" rel="noopener noreferrer">进入塞贝风控系统 <ArrowUpRight size={16}/></a> : <button onClick={onContact}>联系顾问获取检测入口 <ArrowUpRight size={16}/></button>}</div>; })}</div>
      {(!serviceLinks.riskOverview || !serviceLinks.asinDetection) && <p className={f.pendingNote}>检测系统的正式入口待接入，当前可先联系鲨保保获取对接指引。</p>}
      <p className={f.notice}>检测服务不直接完成保险投保，风险概览或检测报告不代表保险公司已同意承保；承保仍须经人工沟通及保险公司核保确认。</p>
    </> : <>
      <Scale size={34}/><p>了解 TRO 应对相关 AI 律师服务。外部服务的内容与费用由相应服务方说明，保险责任仍按正式保单约定确认。</p>
      {aiUrl ? <a className={f.exportButton} href={aiUrl} target="_blank" rel="noopener noreferrer">进入 TRO 应对服务 <ArrowUpRight size={17}/></a> : <><p className={f.pendingNote}>AI 律师服务的正式链接待接入，请联系鲨保保获取服务入口。</p><button className={f.exportButton} onClick={onContact}>联系鲨保保获取入口 <ArrowUpRight size={17}/></button></>}
    </>}
  </div>;
}
