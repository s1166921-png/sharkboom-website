"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Variant previews intentionally use full document navigation to isolate their runtimes. */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, FileCheck2, Globe2, Headphones, Menu, MessageCircle, ShieldCheck, X } from "lucide-react";
import { ContactDetails, ContactLinks } from "../contact-details";
import { motionProducts as products, type MotionProduct } from "./products";
import s from "./motion.module.css";
import { SculptedWorld } from "../motion-3d/world";
import t from "../motion-3d/studio.module.css";
import { sitePath } from "../site-path";

const reducedQuery="(prefers-reduced-motion: reduce)";
function subscribeMotion(callback:()=>void){const media=window.matchMedia(reducedQuery);media.addEventListener("change",callback);return()=>media.removeEventListener("change",callback);}
function getReducedMotion(){return window.matchMedia(reducedQuery).matches;}

function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const focus=document.activeElement as HTMLElement|null;
    const oldOverflow=document.body.style.overflow;
    ref.current?.showModal();document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=oldOverflow;focus?.focus();};
  },[]);
  return <dialog ref={ref} className={s.dialog} onCancel={onClose} onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}} aria-label={title}>
    <div className={s.dialogTop}><span>{title}</span><button onClick={onClose} aria-label="关闭弹窗"><X size={21}/></button></div>{children}
  </dialog>;
}

export function MotionHome(){
  const [active,setActive]=useState(0);
  const [autoAdvance,setAutoAdvance]=useState(true);
  const [menu,setMenu]=useState(false);
  const [detail,setDetail]=useState<MotionProduct|null>(null);
  const [contact,setContact]=useState(false);
  const [heroVisible,setHeroVisible]=useState(true);
  const reducedMotion=useSyncExternalStore(subscribeMotion,getReducedMotion,()=>false);
  const tabs=useRef<HTMLDivElement>(null);
  const hero=useRef<HTMLElement>(null);
  const product=products[active];
  const Icon=product.icon;

  useEffect(()=>{
    if(!autoAdvance||reducedMotion||!heroVisible||detail||contact)return;
    const timer=window.setInterval(()=>setActive(index=>(index+1)%products.length),8000);
    return()=>window.clearInterval(timer);
  },[autoAdvance,reducedMotion,heroVisible,detail,contact]);

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
  function talk(){setMenu(false);setDetail(null);setContact(true);}

  return <div className={`${s.site} ${t.studio}`} id="motion-top">
    <a className={s.skipLink} href="#motion-main">跳到主要内容</a>
    <div className={s.previewBar}><span>鲨保保 · 首页风格预览</span><nav aria-label="切换网页风格"><a href={sitePath("/professional")}>蓝白专业</a><a href={sitePath("/ocean")}>深海科技</a><a href={sitePath("/editorial")}>温暖编辑</a><a href={sitePath("/motion-3d")} aria-current="page">鲨鲨航海 <small>3D · 最新</small></a></nav><span className={s.previewMark}>04 / SCULPTED WORLD</span></div>
    <header className={s.header}>
      <div className={s.navInner}>
        <a href="#motion-top" className={s.brand} aria-label="鲨保保首页"><img src={sitePath("/logo.png")} width="763" height="341" alt="SharkBoom 鲨保保"/></a>
        <nav className={`${s.navigation} ${menu?s.navigationOpen:""}`} aria-label="主导航"><a href="#solutions" onClick={()=>setMenu(false)}>保险方案</a><a href="#advantages" onClick={()=>setMenu(false)}>服务优势</a><a href="#about" onClick={()=>setMenu(false)}>关于鲨保保</a></nav>
        <button className={s.contactButton} onClick={talk}>联系我们 <ArrowUpRight size={17}/></button>
        <button className={s.menuButton} onClick={()=>setMenu(value=>!value)} aria-label={menu?"收起导航":"展开导航"} aria-expanded={menu} aria-controls="motion-mobile-menu">{menu?<X/>:<Menu/>}</button>
      </div>
      {menu&&<nav id="motion-mobile-menu" className={s.mobileNav} aria-label="移动主导航"><a href="#solutions" onClick={()=>setMenu(false)}>保险方案 <ArrowUpRight size={17}/></a><a href="#advantages" onClick={()=>setMenu(false)}>服务优势 <ArrowUpRight size={17}/></a><a href="#about" onClick={()=>setMenu(false)}>关于鲨保保 <ArrowUpRight size={17}/></a><button onClick={talk}>联系服务顾问 <MessageCircle size={17}/></button></nav>}
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
          <SculptedWorld reducedMotion={reducedMotion} active={active}/>
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
          }}>{products.map((p,i)=><button key={p.code} id={`motion-tab-${p.code}`} role="tab" aria-selected={active===i} aria-controls="motion-product-panel" tabIndex={active===i?0:-1} onClick={()=>choose(i)}><small>0{i+1} / {p.code}</small><span>{p.name}</span></button>)}</div>
          <div className={s.productPanel} id="motion-product-panel" role="tabpanel" aria-labelledby={`motion-tab-${product.code}`} tabIndex={0}>
            <div className={s.productLead} key={product.code}><div className={s.productKicker}><Icon size={26} strokeWidth={1.35}/><span>0{active+1} / {product.en}</span></div><h3>{product.name}</h3><p className={s.productScene}>{product.scene}</p><p className={s.productDescription}>{product.description}</p><div className={s.panelActions}><button className={s.primary} onClick={()=>setDetail(product)}>了解保障详情 <ArrowUpRight size={18}/></button><button className={s.inlineLink} onClick={talk}>咨询投保方案 <ArrowRight size={16}/></button></div></div>
            <div className={s.productChecklist}><span className={s.miniLabel}>从这些问题开始了解</span>{product.points.map((point,index)=><div key={point}><span>0{index+1}</span><p>{point}</p><Check size={16}/></div>)}<p className={s.productNote}>具体适用条件与保障范围，以确认的方案和正式条款为准。</p></div>
          </div>
          <div className={s.solutionPager}><span>{String(active+1).padStart(2,"0")} <i>/ 05</i></span><p>{product.short}</p><div><button onClick={()=>choose((active+4)%5)} aria-label="上一个险种"><ArrowRight size={19} style={{transform:"rotate(180deg)"}}/></button><button onClick={()=>choose((active+1)%5)} aria-label="下一个险种"><ArrowRight size={19}/></button></div></div>
        </div>
      </section>

      <section id="advantages" className={s.advantages}>
        <div className={s.contentWidth}>
          <div className={s.sectionIntro} data-motion-reveal><div><p className={s.eyebrow}>02 / A CLEARER WAY FORWARD</p><h2>前路很远，<br/>服务离你很近。</h2></div><p>专业的事，一起理清楚。<br/>从第一句咨询，到后续每一步。</p></div>
          <div className={s.advantageGrid}>{[
            {icon:Globe2,name:"懂跨境的经营场景",text:"从销售平台、目标市场与运输路径出发，沟通你的实际保障需求。",en:"UNDERSTAND YOUR BUSINESS"},
            {icon:ShieldCheck,name:"把保障条件说清楚",text:"说明适用条件、责任范围与重要限制，帮助你理解方案、做好准备。",en:"CLARITY BEFORE CHOICE"},
            {icon:Headphones,name:"持续协助服务对接",text:"协助材料准备、渠道办理与后续问题沟通，让每一步都有清楚的方向。",en:"WITH YOU ALONG THE WAY"},
          ].map((item,i)=><article key={item.name} data-motion-reveal><div><item.icon size={31} strokeWidth={1.15}/><span>0{i+1}</span></div><h3>{item.name}</h3><p>{item.text}</p><small>{item.en}</small></article>)}</div>
        </div>
      </section>

      <section id="about" className={s.about}>
        <div className={`${s.contentWidth} ${s.aboutGrid}`}>
          <div className={`${s.aboutArt} ${t.aboutLogo}`} data-motion-reveal><img src={sitePath("/logo.png")} alt="SharkBoom 鲨保保品牌 Logo" width="763" height="341" loading="lazy"/><span>ALWAYS MOVING<br/><b>FORWARD.</b></span></div>
          <div data-motion-reveal><p className={s.eyebrow}>03 / MEET SHARKBOOM</p><h2>专注跨境，<br/>也专注每一个你。</h2><p className={s.aboutLead}>鲨保保，面向中国跨境卖家的<br/>保险与保函服务伙伴。</p><p className={s.aboutBody}>从产品责任到跨境运输，从知识产权风险到欧洲税务担保与贸易收款，我们围绕实际经营需求，协助你了解保障、准备资料、对接服务。</p><button className={s.inlineLink} onClick={talk}>认识你的服务伙伴 <ArrowUpRight size={19}/></button></div>
        </div>
      </section>

      <section className={s.journey}>
        <div className={s.contentWidth}><div className={s.sectionIntro} data-motion-reveal><div><p className={s.eyebrow}>04 / YOUR NEXT CHAPTER</p><h2>把下一程，<br/>交给更充分的准备。</h2></div><p>从了解需求到后续跟进，<br/>一起把流程走清楚。</p></div>
          <ol className={s.journeySteps}>{[{title:"聊聊你的业务",body:"了解经营平台、市场与需求。",icon:MessageCircle},{title:"一起确认方案",body:"沟通保障范围、条件与安排。",icon:ShieldCheck},{title:"协助准备办理",body:"整理资料，对接适用渠道。",icon:FileCheck2},{title:"后续服务跟进",body:"协助问题沟通与理赔资料对接。",icon:Headphones}].map((step,i)=><li key={step.title} data-motion-reveal><span>0{i+1}<step.icon size={22} strokeWidth={1.3}/></span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
        </div>
      </section>

      <section className={s.faqSection}><div className={`${s.contentWidth} ${s.faqGrid}`}><div><p className={s.eyebrow}>A FEW GOOD QUESTIONS</p><h2>还有想了解的？</h2><button className={s.inlineLink} onClick={talk}>和我们聊聊 <ArrowUpRight size={18}/></button></div><div>{[
        {q:"还不确定适合哪个险种，可以先咨询吗？",a:"可以先说明经营平台、销售地区、产品类型与当前问题，由服务人员协助了解适合的保障方向，再沟通具体方案。"},
        {q:"能从官网直接完成投保吗？",a:"官网提供险种介绍与咨询入口。已确认适用渠道后，可进入对应渠道办理。实际报价、核保、支付与出单由相应机构按正式流程处理。在线投保渠道暂未接入，可先通过微信、电话或邮件联系我们。"},
        {q:"投保后遇到问题，可以获得哪些协助？",a:"可联系服务人员了解保单资料、续保安排，以及报案与理赔资料对接等事项。具体保险责任、赔付条件及处理流程以所选方案约定为准。"},
      ].map(item=><details key={item.q}><summary>{item.q}<ChevronDown size={17}/></summary><p>{item.a}</p></details>)}</div></div></section>

      <section className={s.finalCta}><div className={s.contentWidth}><p className={s.eyebrow}>THE WORLD IS WAITING.</p><h2>出发，有备而行。</h2><p>下一段跨境旅程，从一次清楚的沟通开始。</p><button className={s.lightButton} onClick={talk}>联系鲨保保 <ArrowUpRight size={21}/></button></div></section>
    </main>

    <footer className={s.footer}><div className={s.footerTop}><a href="#motion-top" className={s.brand}><img src={sitePath("/logo.png")} width="763" height="341" alt="SharkBoom 鲨保保"/></a><p>跨境保险与保函服务<br/><small>PROTECTION FOR YOUR NEXT CHAPTER.</small></p><a href="https://www.usaeu.com/" target="_blank" rel="noreferrer">返回美鸥官网 <ArrowUpRight size={15}/></a><a href="#motion-top">回到顶部 <ArrowUpRight size={15}/></a></div><ContactLinks/><div className={s.footerBottom}><span>© {new Date().getFullYear()} SharkBoom 鲨保保</span><span>鲨鲨航海 · 3D 设计预览</span><span>支持微信、电话及邮件咨询 · 在线投保渠道待接入</span></div></footer>

    {detail&&<Dialog title="了解保障方向" onClose={()=>setDetail(null)}><div className={s.dialogBody}><p className={s.eyebrow}>{detail.code} / {detail.en}</p><h2>{detail.name}</h2><p className={s.dialogIntro}>{detail.description}</p><section><h3>适合谁了解</h3><p>{detail.audience}</p></section><section><h3>可以协助你了解</h3><ul>{detail.points.map(point=><li key={point}><Check size={16}/>{point}</li>)}</ul></section><section><h3>通常需要准备</h3><p>{detail.materials}</p></section><p className={s.dialogNote}>具体适用条件、保障范围及办理资料，以确认的方案和正式条款为准。</p><button className={s.primary} onClick={talk}>咨询投保方案 <ArrowUpRight size={18}/></button></div></Dialog>}
    {contact&&<Dialog title="联系鲨保保" onClose={()=>setContact(false)}><div className={s.dialogBody}><p className={s.eyebrow}>YOUR NEXT STEP STARTS HERE</p><h2>聊聊你的<br/>跨境保障需求。</h2><p className={s.dialogIntro}>联系鲨保保苏苏，沟通你的经营场景与保障需求。</p><ContactDetails/><button className={s.primary} onClick={()=>{setContact(false);document.getElementById("solutions")?.scrollIntoView({behavior:reducedMotion?"instant":"smooth"});}}>先了解保障方案 <ArrowRight size={18}/></button></div></Dialog>}
  </div>;
}
