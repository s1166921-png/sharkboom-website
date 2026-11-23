import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import plans from '../shared/intake-plans.json' with {type:'json'};

export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const requireThat=(test,message,status=400)=>{if(!test)throw new AppError(message,status);};
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
const now=()=>new Date().toISOString();
const text=(value,max=2000)=>typeof value==='string'?value.trim().slice(0,max):'';

export class Store {
  constructor(file,key){
    requireThat(Buffer.isBuffer(key)&&key.length===32,'数据加密密钥无效',500);this.key=key;
    this.db=new DatabaseSync(file);this.closed=false;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS transactions(provider TEXT NOT NULL,external_id TEXT NOT NULL,payment_id TEXT NOT NULL UNIQUE,PRIMARY KEY(provider,external_id));
      CREATE TABLE IF NOT EXISTS payment_index(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,status TEXT NOT NULL,last_query INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS pending_by_query ON payment_index(status,last_query);
      CREATE TABLE IF NOT EXISTS admins(username TEXT PRIMARY KEY,password TEXT NOT NULL,must_change INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,username TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,created TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,order_id TEXT,detail TEXT);
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
    for(const row of this.db.prepare('SELECT data FROM orders').iterate())for(const p of this.open(row.data).payments)this.db.prepare('INSERT OR IGNORE INTO payment_index(id,order_id,status) VALUES(?,?,?)').run(p.id,p.orderId,p.status);
  }
  close(){if(!this.closed){this.db.close();this.closed=true;}}
  seal(value){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key,iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');}
  open(value){const b=Buffer.from(value,'base64');const decipher=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8'));}
  tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  audit(actor,action,id=null,detail={}){this.db.prepare('INSERT INTO audit(created,actor,action,order_id,detail) VALUES(?,?,?,?,?)').run(now(),actor,action,id,this.seal(detail));}
  get(id){const row=this.db.prepare('SELECT data FROM orders WHERE id=?').get(id);requireThat(row,'订单不存在或访问凭据无效',404);return this.open(row.data);}
  save(o){o.updatedAt=now();this.db.prepare('UPDATE orders SET data=?,updated=? WHERE id=?').run(this.seal(o),o.updatedAt,o.id);return o;}
  authorize(id,token){if(typeof token!=='string'||token.length<30)return false;const row=this.db.prepare('SELECT token_hash FROM orders WHERE id=?').get(id);return !!row&&timingSafeEqual(Buffer.from(row.token_hash),Buffer.from(digest(token)));}
  list(){return this.db.prepare('SELECT data FROM orders ORDER BY created DESC LIMIT 500').all().map(r=>{const o=this.open(r.data);return {id:o.id,product:o.product,companyName:o.fields.companyName,contactName:o.fields.contactName,status:o.status,createdAt:o.createdAt,updatedAt:o.updatedAt,total:o.quote?.total??0,paid:o.payments.filter(p=>p.status==='paid').reduce((a,p)=>a+p.amount,0)};});}
  create({product,fields,consent}){
    requireThat(consent===true,'请同意资料处理说明');requireThat(Object.hasOwn(plans,product),'不支持的险种');requireThat(fields&&typeof fields==='object'&&!Array.isArray(fields),'资料格式无效');
    const clean={};for(const group of plans[product].groups)for(const f of group.fields){const v=text(fields[f.key],f.type==='textarea'?2000:300);requireThat(!f.required||v,'请完整填写必要资料');requireThat(!v||!f.options||f.options.includes(v),'资料选项无效');if(f.type==='email'&&v)requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),'邮箱格式无效');clean[f.key]=v;}
    const id='SB'+new Date().toISOString().slice(0,10).replaceAll('-','')+randomBytes(8).toString('hex').toUpperCase();const token=secret();
    const o={id,product,fields:clean,status:'review',version:0,quote:null,payments:[],policy:null,updates:[{at:now(),message:'资料已提交，等待人工审核与确认报价。'}],createdAt:now(),updatedAt:now(),consentAt:now(),consentVersion:'2026-11-23'};
    this.tx(()=>{this.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?)').run(id,digest(token),this.seal(o),o.createdAt,o.updatedAt);this.audit('customer','submit',id);});return {id,token};
  }
  quote(id,input,actor){return this.tx(()=>{
    const o=this.get(id);requireThat(!o.acceptedAt&&!['closed','issued'].includes(o.status),'客户已确认报价，不能改价');requireThat(input.expectedVersion===o.version,'报价版本已变化，请刷新',409);
    requireThat(Array.isArray(input.items)&&input.items.length>0&&input.items.length<=10,'请填写费用明细');
    const items=input.items.map(x=>{requireThat(['premium','service'].includes(x.kind),'费用类型无效');requireThat(Number.isSafeInteger(x.amount)&&x.amount>0&&x.amount<=100000000,'金额必须为正整数分，且不超过一百万元');requireThat(text(x.title,100)&&text(x.recipientId,64)&&text(x.recipientName,150),'请填写项目和收款主体');return {id:randomBytes(8).toString('hex'),kind:x.kind,title:text(x.title,100),amount:x.amount,recipientId:text(x.recipientId,64),recipientName:text(x.recipientName,150)};});
    const total=items.reduce((a,x)=>a+x.amount,0);requireThat(total<=100000000,'报价总金额超出限制');requireThat(Date.parse(input.expiresAt)>Date.now()+60000&&Date.parse(input.expiresAt)<Date.now()+90*86400000,'报价有效期无效');requireThat(text(input.terms),'请填写保障、服务与退款约定');
    o.version++;o.quote={version:o.version,currency:'CNY',items,total,terms:text(input.terms,5000),expiresAt:new Date(input.expiresAt).toISOString(),createdAt:now()};o.status='quoted';o.updates.push({at:now(),message:'人工审核完成，请核对报价明细并确认。'});this.audit(actor,'quote',id,{version:o.version,total});return this.save(o);
  });}
  accept(id,version){return this.tx(()=>{const o=this.get(id);requireThat(o.quote,'尚未生成报价');requireThat(version===o.version,'报价版本已更新，请重新查看',409);requireThat(Date.parse(o.quote.expiresAt)>Date.now(),'报价已过期，请联系顾问');requireThat(['quoted','confirmed'].includes(o.status),'当前不能确认报价');if(!o.acceptedAt){o.acceptedAt=now();o.status='confirmed';o.updates.push({at:now(),message:'客户已确认费用明细，等待官方渠道支付。'});this.audit('customer','accept_quote',id,{version});this.save(o);}return o;});}
  payment(id,itemId,provider){return this.tx(()=>{const o=this.get(id);requireThat(o.acceptedAt&&['confirmed','part_paid'].includes(o.status),'请先确认报价');requireThat(Date.parse(o.quote.expiresAt)>Date.now(),'报价已过期，请联系顾问');const item=o.quote.items.find(i=>i.id===itemId);requireThat(item,'费用项目不存在');requireThat(['wechat','alipay'].includes(provider),'支付渠道无效');const existing=o.payments.find(p=>p.itemId===itemId&&p.status!=='closed');if(existing){requireThat(existing.status!=='paid','该项目已收款');requireThat(existing.provider===provider,'已有支付单，请使用原渠道或联系顾问关闭后重试');return existing;}
    const p={id:'P'+randomBytes(15).toString('hex'),orderId:id,itemId,provider,recipientId:item.recipientId,amount:item.amount,currency:'CNY',status:'pending',createdAt:now()};o.payments.push(p);this.db.prepare('INSERT INTO payment_index(id,order_id,status) VALUES(?,?,?)').run(p.id,id,p.status);this.save(o);this.audit('customer','payment_created',id,{paymentId:p.id,amount:p.amount});return p;});}
  findPayment(id){const row=this.db.prepare('SELECT order_id FROM payment_index WHERE id=?').get(id);if(row){const p=this.get(row.order_id).payments.find(x=>x.id===id);if(p)return p;}throw new AppError('支付单不存在',404);}
  pendingPayments(limit=20){return this.db.prepare("SELECT id FROM payment_index WHERE status='pending' ORDER BY last_query ASC,id ASC LIMIT ?").all(limit).map(r=>this.findPayment(r.id));}
  markQueried(id){this.db.prepare('UPDATE payment_index SET last_query=? WHERE id=?').run(Date.now(),id);}
  amend(id,reason,actor){return this.tx(()=>{const o=this.get(id);requireThat(o.acceptedAt&&['confirmed','part_paid'].includes(o.status),'当前不能撤回报价');requireThat(!o.payments.some(p=>p.status==='paid'),'已有收款，不能撤回报价，请先按约定处理退款或变更');requireThat(o.payments.every(p=>p.status==='closed'),'请先核查并关闭所有待支付单');requireThat(text(reason),'请填写撤回原因');(o.quoteHistory??=[]).push({quote:o.quote,acceptedAt:o.acceptedAt,withdrawnAt:now(),reason:text(reason)});delete o.acceptedAt;o.quote=null;o.version++;o.status='review';o.updates.push({at:now(),message:'本次报价已撤回，重新进入人工审核；新报价需要再次确认。原因：'+text(reason)});this.audit(actor,'quote_withdrawn',id,{reason:text(reason),version:o.version});return this.save(o);});}
  paid(proof){return this.tx(()=>{const p=this.findPayment(proof.id);requireThat(p.provider===proof.provider&&p.recipientId===proof.recipientId,'支付渠道或商户不匹配');requireThat(p.amount===proof.amount&&proof.currency==='CNY','支付金额或币种不匹配');requireThat(typeof proof.transactionId==='string'&&proof.transactionId.length>0&&proof.transactionId.length<100,'交易流水无效');const o=this.get(p.orderId);const target=o.payments.find(x=>x.id===p.id);
    if(target.status==='paid'){requireThat(target.transactionId===proof.transactionId,'交易流水冲突',409);return o;}
    requireThat(target.status==='pending','支付单状态冲突',409);requireThat(!this.db.prepare('SELECT 1 FROM transactions WHERE provider=? AND external_id=?').get(proof.provider,proof.transactionId),'交易流水已使用',409);
    this.db.prepare('INSERT INTO transactions VALUES(?,?,?)').run(p.provider,proof.transactionId,p.id);this.db.prepare("UPDATE payment_index SET status='paid' WHERE id=?").run(p.id);Object.assign(target,{status:'paid',transactionId:proof.transactionId,paidAt:proof.paidAt||now(),verifiedAt:now()});const paid=o.payments.filter(x=>x.status==='paid').reduce((a,x)=>a+x.amount,0);o.status=paid===o.quote.total?'paid':'part_paid';o.updates.push({at:now(),message:o.status==='paid'?'全部费用已核验收款，正在安排出单。':'一笔费用已核验收款，其余费用待支付。'});this.audit('provider','payment_verified',o.id,{paymentId:p.id,transactionId:proof.transactionId,amount:p.amount});return this.save(o);
  });}
  closePayment(id,actor){return this.tx(()=>{const p=this.findPayment(id);const o=this.get(p.orderId);const target=o.payments.find(x=>x.id===id);requireThat(target.status==='pending','仅可关闭待支付单');target.status='closed';this.db.prepare("UPDATE payment_index SET status='closed' WHERE id=?").run(id);this.audit(actor,'payment_closed',o.id,{paymentId:id});return this.save(o);});}
  followup(id,{status,note},actor){return this.tx(()=>{const o=this.get(id);requireThat(['review','needs_info','closed'].includes(status),'跟进状态无效');requireThat(!o.acceptedAt,'已确认报价的订单请使用出单跟进');requireThat(text(note),'请填写给客户的说明');o.status=status;o.quote=null;o.version++;o.updates.push({at:now(),message:text(note)});this.audit(actor,'followup',id,{status});return this.save(o);});}
  fulfill(id,input,actor){return this.tx(()=>{const o=this.get(id);requireThat(['paid','issuing','issued'].includes(o.status),'尚未核验全部收款，不能出单');requireThat(['issuing','issued'].includes(input.status),'出单状态无效');requireThat(o.status!=='issued','订单已完成出单');if(input.status==='issued')requireThat(text(input.policyNumber)&&text(input.insurer)&&text(input.effectiveDate),'请填写正式单号、承保/出函机构和生效日期');o.status=input.status;o.policy={policyNumber:text(input.policyNumber,150),insurer:text(input.insurer,150),effectiveDate:text(input.effectiveDate,50),note:text(input.note),updatedAt:now()};o.updates.push({at:now(),message:input.status==='issued'?'已登记出单信息，请联系顾问获取并核对正式文件。':text(input.note)||'正在跟进出单。'});this.audit(actor,'fulfill',id,{status:input.status});return this.save(o);});}
  updateFields(id,fields){return this.tx(()=>{const o=this.get(id);requireThat(o.status==='needs_info','当前不能补充资料');const clean={};for(const group of plans[o.product].groups)for(const f of group.fields){const v=text(fields?.[f.key],f.type==='textarea'?2000:300);requireThat(!f.required||v,'请完整填写必要资料');requireThat(!v||!f.options||f.options.includes(v),'资料选项无效');clean[f.key]=v;}o.fields=clean;o.status='review';o.updates.push({at:now(),message:'客户已补充资料，等待重新审核。'});this.audit('customer','resubmit',id);return this.save(o);});}
  auditFor(id){return this.db.prepare('SELECT created,actor,action,detail FROM audit WHERE order_id=? ORDER BY id DESC LIMIT 100').all(id).map(r=>({...r,detail:this.open(r.detail)}));}
}
