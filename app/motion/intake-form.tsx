import { useState, type FormEvent, type MouseEvent } from "react";
import { ArrowUpRight, Check, Copy, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { intakeNotice, intakePlans, type IntakeCode, type IntakeValues } from "./intake-fields";
import { buildIntakeWorkbook, intakeFilename } from "./intake-workbook.mjs";
import { salesContactText } from "./contact-info";
import { sitePath } from "../site-path";
import f from "./intake.module.css";

type Props = {
  code: IntakeCode;
  initialValues: IntakeValues;
  previouslyExported: boolean;
  previousOrderLink: string;
  onOrderCreated: (link: string) => void;
  onValues: (values: IntakeValues) => void;
  onExport: () => void;
  onContact: (message: string) => void;
  onAiLawyer: () => void;
};

export function IntakeForm({ code, initialValues, previouslyExported, previousOrderLink, onOrderCreated, onValues, onExport, onContact, onAiLawyer }: Props) {
  const plan = intakePlans[code];
  const [values, setValues] = useState<IntakeValues>(initialValues);
  const [exported, setExported] = useState(previouslyExported);
  const [status, setStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderLink, setOrderLink] = useState(previousOrderLink);

  async function submitReview(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form?.reportValidity()) return;
    if (!consent) { setStatus("请先阅读并同意下方资料处理说明。"); return; }
    for (const group of plan.groups) for (const field of group.fields) {
      if (field.required && !values[field.key]?.trim()) { setStatus(`请填写${field.label}。`); document.getElementById(`intake-${code}-${field.key}`)?.focus(); return; }
    }
    setSubmitting(true); setStatus("");
    try {
      const response = await fetch(sitePath("/api/orders"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: code, fields: values, consent: true }) });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("此预览页面未连接订单后台，请前往 sharkboom.meiouyuncang.com 官网提交。");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "暂时无法提交，请稍后重试。");
      const link = sitePath("/orders") + "#" + new URLSearchParams({ order: result.id, key: result.token });
      setOrderLink(link); onOrderCreated(link); setStatus(`资料已提交，订单号：${result.id}。请立即打开并保存专属订单链接，等待人工审核与报价。`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "网络连接异常，请重试或联系顾问。"); }
    finally { setSubmitting(false); }
  }

  function update(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next); onValues(next); setExported(false); setStatus("");
  }

  function exportWorkbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Whitespace-only required fields should not create an unusable collection sheet.
    for (const group of plan.groups) for (const field of group.fields) {
      if (field.required && !values[field.key]?.trim()) {
        setStatus(`请填写${field.label}。`);
        document.getElementById(`intake-${code}-${field.key}`)?.focus();
        return;
      }
    }
    try {
      const bytes = buildIntakeWorkbook({
        productName: plan.name, notice: intakeNotice, contactText: salesContactText,
        groups: plan.groups.map(group => ({ title: group.title, fields: group.fields.map(field => ({ label: field.label, value: values[field.key] ?? "" })) })),
      });
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = intakeFilename(plan.fileLabel, values.companyName);
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExported(true); onExport();
      setStatus("Excel 已生成并发起下载。请保存文件，再联系鲨保保发送资料，由人工核保确认办理。");
    } catch {
      setStatus("暂时无法生成 Excel，请重试。你填写的内容仍保留在当前页面。");
    }
  }

  async function copyAndContact() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(salesContactText);
      onContact("联系方式已复制。请添加微信或发送邮件，并将导出的 Excel 交给服务人员。");
    } catch {
      setManualCopy(true);
      setStatus("浏览器未能自动复制，请在下方选中并手动复制联系方式，再前往联系模块。");
    } finally {
      setCopying(false);
    }
  }

  return <div className={f.intake}>
    <div className={f.formHeading}><span><FileSpreadsheet size={22}/>{code} / INFORMATION COLLECTION</span><h2>{plan.name}<br/>信息采集表</h2><p>{plan.intro}</p></div>
    <div className={f.localNote}><ShieldCheck size={17}/><p>你可以仅在本机导出 Excel 留存，也可以提交资料由鲨保保人工审核。提交后会生成专属订单链接，用于查看报价、确认费用和跟进出单。未提交的内容仅暂存于当前页面。</p></div>
    <form onSubmit={exportWorkbook}>
      {plan.groups.map(group => <fieldset disabled={!!orderLink} key={group.title} className={f.fieldset}><legend>{group.title}</legend><div className={f.fieldGrid}>{group.fields.map(field => {
        const id = `intake-${code}-${field.key}`;
        const className = field.type === "textarea" ? `${f.field} ${f.fullField}` : f.field;
        const common = { id, name: field.key, required: field.required, value: values[field.key] ?? "", "aria-describedby": field.hint ? `${id}-hint` : undefined };
        return <div className={className} key={field.key}><label htmlFor={id}>{field.label}{field.required && <span> *</span>}</label>
          {field.type === "select" ? <select {...common} onChange={e => update(field.key, e.target.value)}><option value="">{field.required ? "请选择" : "请选择（选填）"}</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
            : field.type === "textarea" ? <textarea {...common} rows={3} maxLength={2000} placeholder={field.placeholder} onChange={e => update(field.key, e.target.value)}/>
              : <input {...common} type={field.type ?? "text"} maxLength={300} placeholder={field.placeholder} autoComplete={field.key === "companyName" ? "organization" : field.key === "contactName" ? "name" : field.key === "email" ? "email" : field.key === "phone" ? "tel" : "off"} onChange={e => update(field.key, e.target.value)}/>}
          {field.hint && <small id={`${id}-hint`}>{field.hint}</small>}
        </div>;
      })}</div></fieldset>)}
      <p className={f.materials}><b>后续资料准备：</b>{plan.materials}</p>
      <p className={f.notice}>{intakeNotice}</p>
      <details className={f.privacy}><summary>资料处理与订单办理说明</summary><p>提交的企业、联系人及业务信息，将由鲨保保授权人员用于联系、人工审核、报价、支付核对与出单跟进，加密保存在官网服务器。我们不在此收集银行卡密码、支付密码或身份证照片。</p><p>实际投保前，将由顾问另行告知并确认承保机构、资料递交对象与要求；未经确认不会通过本页面自动向保险公司递交申请。资料更正、删除或保存期限相关事项，可联系 huan@seamew.net / 19386967340；依法必须留存的交易记录按适用要求处理。</p><p>请确保有权提供所填写的企业及联系人信息。完整订单链接可访问本订单，请妥善保管。付款不等于自动承保，保障以正式保单或保函为准。</p></details>
      <label className={f.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>我已阅读资料处理说明，同意提交资料用于本次审核、报价和订单办理。</span></label>
      <button className={f.submitReview} type="button" disabled={submitting || !!orderLink} onClick={submitReview}>{submitting ? "正在提交…" : orderLink ? "资料已提交，等待人工审核" : "提交资料，等待人工审核"}<ArrowUpRight size={18}/></button>
      {orderLink && <div className={f.orderSuccess}><b>已创建专属订单</b><p>请打开并保存订单链接。后续报价、支付核验与出单进度都可在此查看。</p><a href={orderLink}>查看并保存我的订单 →</a><small>私密链接请勿公开转发。关闭弹窗后，请使用已保存的链接继续办理。</small></div>}
      <div className={f.formActions}><button className={f.exportButton} type="submit"><Download size={17}/>导出信息收集 Excel</button><button className={f.copyButton} type="button" disabled={copying} onClick={copyAndContact}><Copy size={17}/>{copying ? "正在复制…" : "复制对接联系方式｜联系鲨保保出单"}</button></div>
      <p className={f.formStatus} role="status" aria-live="polite">{status}</p>
      {manualCopy && <div className={f.manualCopy}><label htmlFor={`contact-copy-${code}`}>手动复制联系方式</label><textarea id={`contact-copy-${code}`} readOnly rows={6} value={salesContactText} onFocus={e => e.target.select()}/><button type="button" onClick={() => onContact("请通过以下方式联系鲨保保，并发送已导出的信息收集表。")}>前往联系模块 <ArrowUpRight size={16}/></button></div>}
      {code === "TRO" && exported && <div className={f.afterExport}><span><Check size={16}/>已生成 TRO 信息收集表</span><p>如需了解 TRO 应对相关服务，可继续查看 AI 律师服务入口。</p><button type="button" onClick={onAiLawyer}>TRO应对-AI律师服务 <ArrowUpRight size={17}/></button></div>}
    </form>
  </div>;
}
