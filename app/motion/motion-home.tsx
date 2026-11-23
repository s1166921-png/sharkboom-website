"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, MessageCircle, X } from "lucide-react";
import { ContactDetails, ContactLinks } from "../contact-details";
import { motionProducts as products, productPrices, type MotionProduct } from "./products";
import s from "./motion.module.css";
import { SculptedWorld } from "../motion-3d/world";
import t from "../motion-3d/studio.module.css";
import { sitePath } from "../site-path";
import { MarketingSections } from "./marketing-sections";
import { ProductActions } from "./product-actions";
import { IntakeForm } from "./intake-form";
import { ExternalServices } from "./external-services";
import { salesContact } from "./contact-info";
import type { IntakeCode, IntakeValues } from "./intake-fields";
import f from "./intake.module.css";

const reducedQuery="(prefers-reduced-motion: reduce)";
function subscribeMotion(callback:()=>void){const media=window.matchMedia(reducedQuery);media.addEventListener("change",callback);return()=>media.removeEventListener("change",callback);}
function getReducedMotion(){return window.matchMedia(reducedQuery).matches;}

function Dialog({title,onClose,children,className=""}:{title:string;onClose:()=>void;children:ReactNode;className?:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const focus=document.activeElement as HTMLElement|null;
    const oldOverflow=document.body.style.overflow;
    ref.current?.showModal();document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=oldOverflow;focus?.focus();};
  },[]);
  return <dialog ref={ref} className={`${s.dialog} ${className}`} onCancel={onClose} onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}} aria-label={title}>
    <div className={s.dialogTop}><span>{title}</span><button onClick={onClose} aria-label="关闭弹窗"><X size={21}/></button></div>{children}
  </dialog>;
}

export function MotionHome(){
  const [active,setActive]=useState(0);
  const [autoAdvance,setAutoAdvance]=useState(true);
  const [menu,setMenu]=useState(false);
  const [detail,setDetail]=useState<MotionProduct|null>(null);
  const [contact,setContact]=useState(false);
  const [intake,setIntake]=useState<IntakeCode|null>(null);
  const [drafts,setDrafts]=useState<Partial<Record<IntakeCode,IntakeValues>>>({});
  const [exported,setExported]=useState<Partial<Record<IntakeCode,boolean>>>({});
  const [orderLinks,setOrderLinks]=useState<Partial<Record<IntakeCode,string>>>({});
  const [external,setExternal]=useState<"risk"|"ai"|null>(null);
  const [handoff,setHandoff]=useState("");
  const [heroVisible,setHeroVisible]=useState(true);
  const reducedMotion=useSyncExternalStore(subscribeMotion,getReducedMotion,()=>false);
  const tabs=useRef<HTMLDivElement>(null);
  const hero=useRef<HTMLElement>(null);
  const product=products[active];
  const Icon=product.icon;

  useEffect(()=>{
    if(!autoAdvance||reducedMotion||!heroVisible||detail||contact||intake||external)return;
    const timer=window.setInterval(()=>setActive(index=>(index+1)%products.length),8000);
    return()=>window.clearInterval(timer);
  },[autoAdvance,reducedMotion,heroVisible,detail,contact,intake,external]);

  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>setHeroVisible(entry.isIntersecting),{threshold:.15});
    if(hero.current)observer.observe(hero.current);
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    const elements=document.querySelectorAll<HTMLElement>("[data-motion-reveal]");
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add(s.revealed);observer.unobserve(entry.target);}}),{threshold:.1});
    elements.forEach(el=>observer.observe(el));return()=>observer.disconnect();
  },[]);

  function choose(index:number){setActive(index);setAutoAdvance(false);}
  function talk(){setMenu(false);setDetail(null);setIntake(null);setExternal(null);setContact(true);}
  function collect(code:IntakeCode){setDetail(null);setExternal(null);setContact(false);setIntake(code);}
  function openExternal(kind:"risk"|"ai"){setDetail(null);setIntake(null);setContact(false);setExternal(kind);}
  function handOff(message:string){
    setIntake(null);setHandoff(message);
    window.setTimeout(()=>document.getElementById("contact")?.scrollIntoView({behavior:reducedMotion?"instant":"smooth"}),0);
  }

  return <div className={`${s.site} ${t.studio}`} id="motion-top">
    <a className={s.skipLink} href="#motion-main">跳到主要内容</a>
    <header className={s.header}>
      <div className={s.navInner}>
        <a href="#motion-top" className={s.brand} aria-label="鲨保保首页"><img src={sitePath("/logo.png")} width="763" height="341" alt="SharkBoom 鲨保保"/></a>
        <nav className={`${s.navigation} ${menu?s.navigationOpen:""}`} aria-label="主导航"><a href="#solutions" onClick={()=>setMenu(false)}>保险方案</a><a href="#advantages" onClick={()=>setMenu(false)}>产品优势</a><a href="#about" onClick={()=>setMenu(false)}>关于鲨保保</a></nav>
        <button className={s.contactButton} onClick={talk}>联系我们 <ArrowUpRight size={17}/></button>
        <button className={s.menuButton} onClick={()=>setMenu(value=>!value)} aria-label={menu?"收起导航":"展开导航"} aria-expanded={menu} aria-controls="motion-mobile-menu">{menu?<X/>:<Menu/>}</button>
      </div>
      {menu&&<nav id="motion-mobile-menu" className={s.mobileNav} aria-label="移动主导航"><a href="#solutions" onClick={()=>setMenu(false)}>保险方案 <ArrowUpRight size={17}/></a><a href="#advantages" onClick={()=>setMenu(false)}>产品优势 <ArrowUpRight size={17}/></a><a href="#about" onClick={()=>setMenu(false)}>关于鲨保保 <ArrowUpRight size={17}/></a><button onClick={talk}>联系服务顾问 <MessageCircle size={17}/></button></nav>}
    </header>

    <main id="motion-main">
      <section className={`${s.hero} ${t.hero}`} ref={hero} aria-labelledby="motion-title">
        <div className={`${s.heroCopy} ${t.copy}`}>
          <p className={s.eyebrow}>SHARKBOOM / GLOBAL PROTECTION</p>
          <h1 id="motion-title">让生意，<br/>跨越山海<span>。</span></h1>
          <p className={s.heroDescription}>跨境保险与保函服务，<br/>陪你走向更远的市场。</p>
          <div className={s.heroActions}><a href="#solutions" className={s.primary}>探索保险方案 <ArrowRight size={21}/></a><button onClick={talk} className={s.textAction}>咨询顾问 <ArrowUpRight size={19}/></button></div>
        </div>

        <div className={`${s.stageShell} ${t.stage}`}>
          <SculptedWorld reducedMotion={reducedMotion} active={{CGL:0,CARGO:1,TRO:2,VIES:3,CREDIT:4}[product.code]}/>
        </div>

      </section>

      <section id="solutions" className={s.solutions} aria-labelledby="solutions-title">
        <div className={s.contentWidth}>
          <div className={s.sectionIntro} data-motion-reveal><div><p className={s.eyebrow}>01 / FIND YOUR PROTECTION</p><h2 id="solutions-title">每一种出海，<br/>都有保障的方向。</h2></div><p>从你的业务出发，<br/>把保障看清楚，再安心向前。</p><a className={s.downLink} href="#motion-product-panel" aria-label="查看当前保障方案"><ArrowDown size={24}/></a></div>
          <div className={`${s.productTabs} ${t.solutionTabs}`} ref={tabs} role="tablist" tabIndex={-1} aria-label="探索五类保障方向" onKeyDown={e=>{
            let next=active;
            if(e.key==="ArrowRight")next=(active+1)%products.length;
            else if(e.key==="ArrowLeft")next=(active+products.length-1)%products.length;
            else if(e.key==="Home")next=0;
            else if(e.key==="End")next=products.length-1;
            else return;
            e.preventDefault();choose(next);tabs.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
          }}>{products.map((p,i)=><button key={p.code} id={`motion-tab-${p.code}`} role="tab" aria-selected={active===i} aria-controls="motion-product-panel" tabIndex={active===i?0:-1} onClick={()=>choose(i)}><small>0{i+1} / {p.code}</small><span>{p.name}</span>{productPrices[p.code]&&<em className={f.tabPrice}>{productPrices[p.code]}</em>}</button>)}</div>
          <div className={s.productPanel} id="motion-product-panel" role="tabpanel" aria-labelledby={`motion-tab-${product.code}`} tabIndex={0}>
            <div className={s.productLead} key={product.code}><div className={s.productKicker}><Icon size={26} strokeWidth={1.35}/><span>0{active+1} / {product.en}</span></div><h3>{product.name}</h3><p className={s.productScene}>{product.scene}</p><p className={s.productDescription}>{product.description}</p><div className={s.panelActions}><button className={s.primary} onClick={()=>setDetail(product)}>了解保障详情 <ArrowUpRight size={18}/></button></div></div>
            <div className={s.productChecklist}><span className={s.miniLabel}>这份方案，重点看这里</span>{product.points.map((point,index)=><div key={point}><span>0{index+1}</span><p>{point}</p><Check size={16}/></div>)}<p className={s.productNote}>具体适用条件与保障范围，以确认的方案和正式条款为准。</p><ProductActions code={product.code} onIntake={collect} onRisk={()=>openExternal("risk")} onContact={talk}/></div>
          </div>
          <div className={s.solutionPager}><span>{String(active+1).padStart(2,"0")} <i>/ 05</i></span><p>{product.short}</p><div><button onClick={()=>choose((active+4)%5)} aria-label="上一个险种"><ArrowRight size={19} style={{transform:"rotate(180deg)"}}/></button><button onClick={()=>choose((active+1)%5)} aria-label="下一个险种"><ArrowRight size={19}/></button></div></div>
        </div>
      </section>

      <MarketingSections onProduct={code=>setDetail(products.find(item=>item.code===code)??null)} onContact={talk} onIntake={collect} onRisk={()=>openExternal("risk")}/>

      <section className={s.faqSection}><div className={`${s.contentWidth} ${s.faqGrid}`}><div><p className={s.eyebrow}>A FEW GOOD QUESTIONS</p><h2>还有想了解的？</h2><button className={s.inlineLink} onClick={talk}>和我们聊聊 <ArrowUpRight size={18}/></button></div><div>{[
        {q:"还不确定适合哪个险种，可以先咨询吗？",a:"可以先说明经营平台、销售地区、产品类型与当前问题，由服务人员协助了解适合的保障方向，再沟通具体方案。"},
        {q:"能从官网直接完成投保吗？",a:"你可以提交险种专属资料，由人工审核并确认报价，再通过专属订单页核对费用。官方支付通道开通后，可在确认明细后付款；后台核验收款，再由顾问跟进出单。填写、导出或付款都不代表保险自动生效，以保险公司核保及正式文件为准。"},
        {q:"投保后遇到问题，可以获得哪些协助？",a:"可联系服务人员了解保单资料、续保安排，以及报案与理赔资料对接等事项。具体保险责任、赔付条件及处理流程以所选方案约定为准。"},
      ].map(item=><details key={item.q}><summary>{item.q}<ChevronDown size={17}/></summary><p>{item.a}</p></details>)}</div></div></section>

      <section id="contact" className={s.finalCta} aria-labelledby="contact-title"><div className={s.contentWidth}><p className={s.eyebrow}>THE WORLD IS WAITING.</p><h2 id="contact-title">出发，有备而行。</h2><p>提交资料后，由鲨保保人工审核报价，陪你完成费用确认与出单。</p><div className={f.contactChannels}><span>微信联系人：{salesContact.wechat}</span><a href={`mailto:${salesContact.email}`}>{salesContact.email}</a><a href={`tel:${salesContact.phone}`}>{salesContact.phone}</a></div>{handoff&&<p className={f.handoff} role="status">{handoff}</p>}<button className={s.lightButton} onClick={talk}>查看微信二维码｜联系鲨保保 <ArrowUpRight size={21}/></button></div></section>
    </main>

    <footer className={s.footer}><div className={s.footerTop}><a href="#motion-top" className={s.brand}><img src={sitePath("/logo.png")} width="763" height="341" alt="SharkBoom 鲨保保"/></a><p>跨境保险与保函服务<br/><small>PROTECTION FOR YOUR NEXT CHAPTER.</small></p><a href="https://www.usaeu.com/" target="_blank" rel="noreferrer">返回美鸥官网 <ArrowUpRight size={15}/></a><a href="https://sharkboom.meiouyuncang.com/orders">订单进度 <ArrowUpRight size={15}/></a><a href="#motion-top">回到顶部 <ArrowUpRight size={15}/></a></div><ContactLinks/><div className={s.footerBottom}><span>© {new Date().getFullYear()} SharkBoom 鲨保保</span><span>资料提交 · 人工核保 · 费用确认 · 出单跟进</span></div></footer>

    {intake&&<Dialog title={`${products.find(p=>p.code===intake)?.name} · 信息采集表`} className={f.dialog} onClose={()=>setIntake(null)}><IntakeForm key={intake} code={intake} initialValues={drafts[intake]??{}} previouslyExported={exported[intake]??false} previousOrderLink={orderLinks[intake]??""} onOrderCreated={link=>setOrderLinks(previous=>({...previous,[intake]:link}))} onValues={values=>{setDrafts(previous=>({...previous,[intake]:values}));setExported(previous=>({...previous,[intake]:false}));}} onExport={()=>setExported(previous=>({...previous,[intake]:true}))} onContact={handOff} onAiLawyer={()=>openExternal("ai")}/></Dialog>}
    {external&&<Dialog title={external==="risk"?"保前侵权检测":"TRO应对-AI律师服务"} onClose={()=>setExternal(null)}><ExternalServices kind={external} onContact={talk}/></Dialog>}
    {detail&&<Dialog title="了解保障方向" onClose={()=>setDetail(null)}><div className={s.dialogBody}><p className={s.eyebrow}>{detail.code} / {detail.en}</p><h2>{detail.name}</h2><p className={s.dialogIntro}>{detail.description}</p><section><h3>适合谁了解</h3><p>{detail.audience}</p></section><section><h3>核心保障与服务</h3><ul>{detail.points.map(point=><li key={point}><Check size={16}/>{point}</li>)}</ul></section>{detail.sections.map(section=><section key={section.title}><h3>{section.title}</h3><p>{section.body}</p></section>)}<section><h3>通常需要准备</h3><p>{detail.materials}</p></section><p className={s.dialogNote}>{detail.notice}</p><button className={s.primary} onClick={talk}>咨询投保方案 <ArrowUpRight size={18}/></button></div></Dialog>}
    {contact&&<Dialog title="联系鲨保保" onClose={()=>setContact(false)}><div className={s.dialogBody}><p className={s.eyebrow}>YOUR NEXT STEP STARTS HERE</p><h2>聊聊你的<br/>跨境保障需求。</h2><p className={s.dialogIntro}>联系鲨保保苏苏，沟通你的经营场景与保障需求。</p><ContactDetails/><button className={s.primary} onClick={()=>{setContact(false);document.getElementById("solutions")?.scrollIntoView({behavior:reducedMotion?"instant":"smooth"});}}>先了解保障方案 <ArrowRight size={18}/></button></div></Dialog>}
  </div>;
}
