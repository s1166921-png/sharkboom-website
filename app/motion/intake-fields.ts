import plans from "../../shared/intake-plans.json";
export type IntakeCode = "VIES" | "CGL" | "TRO" | "CARGO";
export type IntakeValues = Record<string, string>;
export type IntakeField = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: readonly string[];
  hint?: string;
};
export type IntakeGroup = { title: string; fields: readonly IntakeField[] };

export const intakeNotice = "导出表格仅用于信息收集，不直接完成投保，所有投保需要经过鲨保保人工核保，承保、保费、出单以业务人员沟通及保险公司核保结果为准。";


export const intakePlans = plans as Record<IntakeCode, {name: string; fileLabel: string; intro: string; materials: string; groups: readonly IntakeGroup[]}>;
export function isIntakeCode(code: string): code is IntakeCode { return Object.prototype.hasOwnProperty.call(intakePlans, code); }
