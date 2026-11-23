import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { intakeNotice, intakePlans, type IntakeCode, type IntakeValues } from "./intake-fields";
import { buildIntakeWorkbook, intakeFilename } from "./intake-workbook.mjs";
import { salesContactText } from "./contact-info";
import f from "./intake.module.css";

type Props = {
  code: IntakeCode;
  initialValues: IntakeValues;
  previouslyExported: boolean;
  onValues: (values: IntakeValues) => void;
  onExport: () => void;
  onContact: (message: string) => void;
  onAiLawyer: () => void;
};

export function IntakeForm({ code, initialValues, previouslyExported, onValues, onExport, onContact, onAiLawyer }: Props) {
  const plan = intakePlans[code];
  const [values, setValues] = useState<IntakeValues>(initialValues);
  const [exported, setExported] = useState(previouslyExported);
  const [status, setStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [copying, setCopying] = useState(false);

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
    <div className={f.localNote}><ShieldCheck size={17}/><p>填写与导出均在本机浏览器完成，资料不会提交到服务器，仅在当前页面临时保留。关闭弹窗后可继续填写；刷新或离开页面将清空，请及时导出。</p></div>
    <form onSubmit={exportWorkbook}>
      {plan.groups.map(group => <fieldset key={group.title} className={f.fieldset}><legend>{group.title}</legend><div className={f.fieldGrid}>{group.fields.map(field => {
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
      <div className={f.formActions}><button className={f.exportButton} type="submit"><Download size={17}/>导出信息收集 Excel</button><button className={f.copyButton} type="button" disabled={copying} onClick={copyAndContact}><Copy size={17}/>{copying ? "正在复制…" : "复制对接联系方式｜联系鲨保保出单"}</button></div>
      <p className={f.formStatus} role="status" aria-live="polite">{status}</p>
      {manualCopy && <div className={f.manualCopy}><label htmlFor={`contact-copy-${code}`}>手动复制联系方式</label><textarea id={`contact-copy-${code}`} readOnly rows={6} value={salesContactText} onFocus={e => e.target.select()}/><button type="button" onClick={() => onContact("请通过以下方式联系鲨保保，并发送已导出的信息收集表。")}>前往联系模块 <ArrowUpRight size={16}/></button></div>}
      {code === "TRO" && exported && <div className={f.afterExport}><span><Check size={16}/>已生成 TRO 信息收集表</span><p>如需了解 TRO 应对相关服务，可继续查看 AI 律师服务入口。</p><button type="button" onClick={onAiLawyer}>TRO应对-AI律师服务 <ArrowUpRight size={17}/></button></div>}
    </form>
  </div>;
}
