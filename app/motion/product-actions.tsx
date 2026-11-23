import { ArrowUpRight, Radar } from "lucide-react";
import { isIntakeCode, type IntakeCode } from "./intake-fields";
import { productPrices, type MotionProduct } from "./products";
import f from "./intake.module.css";

export function ProductActions({ code, onIntake, onRisk, onContact, dark = false }: {
  code: MotionProduct["code"];
  onIntake: (code: IntakeCode) => void;
  onRisk: () => void;
  onContact: () => void;
  dark?: boolean;
}) {
  const price = productPrices[code];
  return <div className={dark ? f.darkActions : undefined} data-product-actions={code}>
    {price && <div className={f.priceLine}><p>{price}<small>参考价格，适用条件、费用及出单以业务人员沟通和保险公司核保结果为准。</small></p></div>}
    <div className={`${f.actions} ${code === "TRO" ? f.troActions : ""}`}>
      {code === "TRO" && <button className={f.riskButton} onClick={onRisk}><Radar size={17}/>保前侵权检测 <ArrowUpRight size={16}/></button>}
      {isIntakeCode(code) ? <button className={`${f.enroll} ${code === "TRO" ? f.secondaryEnroll : ""}`} onClick={() => onIntake(code)}>立即投保 <ArrowUpRight size={16}/></button> : <button className={f.consult} onClick={onContact}>咨询投保方案 <ArrowUpRight size={16}/></button>}
    </div>
  </div>;
}
