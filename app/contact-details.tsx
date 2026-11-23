import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { sitePath } from "./site-path";
import s from "./contact-details.module.css";
import { salesContact as contact } from "./motion/contact-info";

export function ContactLinks() {
  return <address className={s.inline} aria-label="鲨保保联系方式">
    <a href={`tel:${contact.phone}`}><Phone size={15} aria-hidden="true"/><span>{contact.phone}</span></a>
    <a href={`mailto:${contact.email}`}><Mail size={15} aria-hidden="true"/><span>{contact.email}</span></a>
  </address>;
}

export function ContactDetails() {
  return <div className={s.details}>
    <div className={s.channels}>
      <a href={`tel:${contact.phone}`} className={s.channel}>
        <Phone size={21} aria-hidden="true"/>
        <span><small>工作手机号</small><strong>{contact.phone}</strong></span>
        <ArrowUpRight size={17} aria-hidden="true"/>
      </a>
      <a href={`mailto:${contact.email}`} className={s.channel}>
        <Mail size={21} aria-hidden="true"/>
        <span><small>电子邮箱</small><strong>{contact.email}</strong></span>
        <ArrowUpRight size={17} aria-hidden="true"/>
      </a>
    </div>
    <figure className={s.wechat}>
      <figcaption><MessageCircle size={19} aria-hidden="true"/><span>微信咨询 · {contact.wechat}</span></figcaption>
      <img src={sitePath(contact.qr)} width="548" height="811" alt="sharkboom苏苏的微信二维码，扫码添加好友咨询跨境保险" decoding="async"/>
      <a href={sitePath(contact.qr)} target="_blank" rel="noreferrer">查看二维码原图 <ArrowUpRight size={14} aria-hidden="true"/></a>
    </figure>
    <p className={s.note}>扫码添加微信，或通过电话、邮件沟通你的业务需求。<br/>投保须联系顾问，经人工核保确认后办理出单。</p>
  </div>;
}
