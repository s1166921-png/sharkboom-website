import { ArrowRight, ArrowUpRight, Check, FileCheck2, FileText, Globe2, Headphones, Layers3, MessageCircle, PackageCheck, Radar, Scale, ShieldCheck, Ship, Wallet } from "lucide-react";
import { sitePath } from "../site-path";
import type { MotionProduct } from "./products";
import m from "./marketing.module.css";

type Props = {
  onProduct: (code: MotionProduct["code"]) => void;
  onContact: () => void;
};

export function MarketingSections({ onProduct, onContact }: Props) {
  return <>
    <section id="advantages" className={`${m.section} ${m.products}`} aria-labelledby="benefits-title">
      <div className={m.width}>
        <div className={m.intro} data-motion-reveal>
          <div><p className={m.eyebrow}>02 / BUILT FOR YOUR BUSINESS</p><h2 id="benefits-title">生意里的难题，<br/>有针对性的保障。</h2></div>
          <p>上架、发货、经营、拓展市场。<br/>把保障放进真实的业务环节，<br/>让每一份投入，都有清楚的方向。</p>
        </div>

        <div className={m.benefitGrid}>
          <article className={`${m.card} ${m.cgl}`} data-motion-reveal>
            <div className={m.cardTop}><span>CGL / 产品责任险</span><ShieldCheck size={23} strokeWidth={1.5}/></div>
            <h3>产品走向海外，<br/>保障与凭证一起备齐。</h3>
            <p className={m.cardBody}>产品造成第三方人身伤害或财产损失？提前安排责任保障，也为平台保险审核做好准备。</p>
            <div className={m.documentVisual} aria-label="可配套中英文保单、英文 COI 与发票">
              <div><FileText size={24}/><b>POLICY</b><span>正式中英文保单</span><i/><i/></div>
              <div><FileCheck2 size={24}/><b>COI</b><span>平台专用英文凭证</span><i/><i/></div>
              <span className={m.documentSeal}><Check size={15}/> 配套发票</span>
            </div>
            <ul className={m.featureList}><li><Check/>境内、境外企业主体均可咨询承保</li><li><Check/>按平台、站点与销售品类匹配保障条件</li></ul>
            <p className={m.cardNote}>面向 Amazon、Wayfair、Walmart、Home Depot 等平台经营场景；具体要求与凭证接受情况以平台审核为准。</p>
            <button className={m.cardLink} onClick={() => onProduct("CGL")}>查看责任保障与交付文件 <ArrowUpRight size={19}/></button>
          </article>

          <article className={`${m.card} ${m.cargo}`} data-motion-reveal>
            <div className={m.cardTop}><span>CARGO / 国际货运险</span><Ship size={23} strokeWidth={1.5}/></div>
            <h3>货到仓，<br/>保障还可以再往前一步。</h3>
            <p className={m.cardBody}>除了运输途中的丢失、短少与破损，还可选择延伸至亚马逊仓库上架环节的方案。</p>
            <div className={m.routeVisual} aria-label="可选保障终点：到港、到仓、上架、全程">
              <span>按业务选择保障终点</span>
              <div>{["到港", "到仓", "上架", "全程"].map((name, i) => <div key={name} className={i === 2 ? m.routeFocus : undefined}><i>{i === 2 ? <PackageCheck size={18}/> : <Check size={12}/>}</i><b>{name}</b></div>)}</div>
              <p>签收到仓后未上架，也有对应方案可咨询</p>
            </div>
            <ul className={m.featureList}><li><Check/>单票投保、月度预约，适配不同出货节奏</li><li><Check/>可咨询按发票货值 110% 确定保险金额</li></ul>
            <p className={m.cardNote}>上架保障的等待期、索赔证明及赔付条件须按所选条款确认；保险金额不等于实际赔款，适用免赔与责任限额。</p>
            <button className={m.cardLink} onClick={() => onProduct("CARGO")}>找到适合这批货的保障 <ArrowUpRight size={19}/></button>
          </article>

          <article className={`${m.card} ${m.tro}`} data-motion-reveal>
            <div className={m.cardTop}><span>TRO / 侵权诉讼保险</span><Scale size={23} strokeWidth={1.5}/></div>
            <h3>把风险排查，<br/>放在收到 TRO 之前。</h3>
            <p className={m.cardBody}>从店铺 Listing 风险监测，到符合条件的法律费用与赔偿责任保障，为非故意侵权风险提前准备。</p>
            <div className={m.radarVisual}><div><Radar size={44} strokeWidth={1.1}/><strong>7<span>×</span>24</strong></div><p>店铺授权后，通过指定第三方平台<br/>提供全店铺风控监测与风险提示。</p></div>
            <ul className={m.featureList}><li><Check/>关注外观专利、商标及版权侵权风险</li><li><Check/>指定专业机构或律师介入，协助案件处理</li></ul>
            <p className={m.cardNote}>须满足非故意侵权、保险期间首次收到承保区域法院签发的 TRO 等条件；高风险 Listing 须整改并经确认后方可纳保，故意侵权不保。</p>
            <button className={m.cardLink} onClick={() => onProduct("TRO")}>了解风控服务与费用保障 <ArrowUpRight size={19}/></button>
          </article>

          <article className={`${m.card} ${m.vies}`} data-motion-reveal>
            <div className={m.cardTop}><span>VIES / 意大利保险保函</span><Wallet size={23} strokeWidth={1.5}/></div>
            <h3>为意大利市场做准备，<br/>也为周转资金留空间。</h3>
            <p className={m.cardBody}>符合条件的企业可通过保险保函满足担保要求，减少直接提供全额保证金带来的现金占用。</p>
            <div className={m.guaranteeVisual}><div><span>担保额度最低要求</span><strong>€50,000</strong></div><div><b>36<span>个月</span></b><span>最低担保期限</span></div></div>
            <ul className={m.featureList}><li><Check/>核实企业适用条件，协助申请与资料递交</li><li><Check/>提前说清保费、担保安排及追偿责任</li></ul>
            <p className={m.cardNote}>适用于符合意大利相关规定的非欧盟／非欧洲经济区企业。保函不免除纳税义务；保险公司履约垫付后，可依协议追偿。</p>
            <button className={m.cardLink} onClick={() => onProduct("VIES")}>咨询企业适用条件 <ArrowUpRight size={19}/></button>
          </article>
        </div>
        <p className={m.sectionNote}>产品介绍用于了解保障方向。承保主体、费用、责任范围、免赔与除外责任，以核保结果、正式保单及服务协议为准。</p>
      </div>
    </section>

    <section id="about" className={`${m.section} ${m.about}`} aria-labelledby="about-title">
      <div className={m.width}>
        <div className={m.aboutGrid}>
          <div className={m.brandPanel} data-motion-reveal><p className={m.eyebrow}>SHARKBOOM / YOUR SERVICE PARTNER</p><img src={sitePath("/logo.png")} alt="SharkBoom 鲨保保品牌 Logo" width="763" height="341" loading="lazy"/><div><span>专注跨境保险与保函服务</span><b>陪生意走远，<br/>把服务做近。</b></div><a href="https://www.usaeu.com/" target="_blank" rel="noreferrer">与美鸥跨境协作，服务企业出海 <ArrowUpRight size={16}/></a></div>
          <div className={m.aboutCopy} data-motion-reveal>
            <p className={m.eyebrow}>03 / MEET SHARKBOOM</p><h2 id="about-title">懂保险，<br/>也懂跨境生意的每一步。</h2>
            <p className={m.aboutLead}>一位专属服务人员，串起投保前后的事。</p>
            <p className={m.aboutBody}>鲨保保专注中国跨境卖家的保险与保函需求。结合保险行业经验与跨境服务资源，从挑选方案、准备凭证，到出险后的资料与渠道沟通，让服务持续跟进。</p>
            <ul className={m.valueList}>
              <li><Layers3 size={22}/><div><h3>围绕业务配方案</h3><p>结合平台、品类、运输链路与市场要求，对接产品责任、货运、TRO、保函等不同保障。</p></div></li>
              <li><Headphones size={22}/><div><h3>专属人员全程跟进</h3><p>投保资料、凭证核对、保单变更与后续咨询，有明确的服务对接人。</p></div></li>
              <li><Globe2 size={22}/><div><h3>出险后协助对接专业资源</h3><p>按案件与方案安排，协助沟通保险公司、查勘机构或专业法律服务机构。</p></div></li>
            </ul>
            <button className={m.aboutLink} onClick={onContact}>联系你的专属服务伙伴 <ArrowUpRight size={18}/></button>
          </div>
        </div>
        <div className={m.serviceStrip} aria-label="售前售中售后服务"><p><span>投保前</span>看懂方案与责任边界</p><ArrowRight/><p><span>办理中</span>跟进资料与保单凭证</p><ArrowRight/><p><span>出险后</span>协助报案与理赔对接</p></div>
      </div>
    </section>

    <section id="service" className={`${m.section} ${m.service}`} aria-labelledby="service-title">
      <div className={m.width}>
        <div className={m.intro} data-motion-reveal><div><p className={m.eyebrow}>04 / FROM FIRST QUESTION TO FOLLOW-UP</p><h2 id="service-title">投保有人带，<br/>出险有人跟。</h2></div><p>把复杂流程拆成清楚的每一步。<br/>你专注经营，我们协助对接保障。</p></div>
        <ol className={m.steps}>
          {[
            { icon: MessageCircle, title: "说清业务，匹配方向", body: "告诉我们经营平台、销售品类、目标市场，或货物运输安排。", result: "明确保障需求" },
            { icon: ShieldCheck, title: "核对条件，确认方案", body: "逐项沟通保障范围、额度、保费、免赔与除外责任，再确认投保安排。", result: "看懂方案再办理" },
            { icon: FileCheck2, title: "备齐资料，跟进交付", body: "协助整理申请材料、对接核保与出单，并核对保单、COI 或保函文件。", result: "拿到对应凭证" },
            { icon: Headphones, title: "持续跟进，协助理赔", body: "提供保单问题与续保咨询；出险后，协助报案、取证资料整理及渠道沟通。", result: "后续服务有对接" },
          ].map((step, i) => <li key={step.title} data-motion-reveal><div><span>0{i + 1}</span><step.icon size={24} strokeWidth={1.4}/></div><h3>{step.title}</h3><p>{step.body}</p><small><Check size={13}/>{step.result}</small></li>)}
        </ol>
        <div className={m.claimsPanel} data-motion-reveal>
          <div><span className={m.eyebrow}>WHEN YOU NEED SUPPORT</span><h3>真的出险了，<br/>先把这三件事做好。</h3><button onClick={onContact}>联系服务人员 <ArrowUpRight size={18}/></button></div>
          <ol><li><span>01</span><div><h4>尽快报案</h4><p>发现货损、收到索赔或 TRO 通知后，及时联系服务人员，并按保单要求通知保险公司。</p></div></li><li><span>02</span><div><h4>保留证据</h4><p>保存货损照片与视频、物流签收及异常记录；涉及诉讼，保留法院文书与平台通知。</p></div></li><li><span>03</span><div><h4>整理资料，跟进处理</h4><p>备妥保单、发票、运输单据或案件材料，配合保险公司及指定专业机构审核。</p></div></li></ol>
        </div>
        <p className={m.sectionNote}>不同险种的通知时限与索赔材料不同，请按具体保单执行；是否赔付、赔付金额及处理时效由保险公司依约审核确定。</p>
      </div>
    </section>
  </>;
}
