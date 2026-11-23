import {sign,verify,randomBytes,createDecipheriv} from 'node:crypto';
import {AlipaySdk} from 'alipay-sdk';
import QRCode from 'qrcode';
import {AppError,requireThat} from './store.mjs';

export function verifyWechat(headers,raw,publicKeys){
  const timestamp=headers['wechatpay-timestamp'],nonce=headers['wechatpay-nonce'],serial=headers['wechatpay-serial'],signature=headers['wechatpay-signature'];
  requireThat(/^\d+$/.test(timestamp||'')&&Math.abs(Date.now()/1000-Number(timestamp))<=300,'支付签名时间无效',401);
  requireThat(typeof nonce==='string'&&nonce.length>0&&nonce.length<=100&&typeof signature==='string','支付签名无效',401);
  requireThat(Object.hasOwn(publicKeys,serial),'支付验签公钥未配置或已轮换',401);
  requireThat(verify('RSA-SHA256',Buffer.from(`${timestamp}\n${nonce}\n${raw}\n`),publicKeys[serial],Buffer.from(signature,'base64')),'支付签名无效',401);return true;
}
export function decryptWechat(resource,apiV3Key){requireThat(resource?.algorithm==='AEAD_AES_256_GCM','支付加密格式无效',401);const data=Buffer.from(resource.ciphertext,'base64');requireThat(data.length>16,'支付密文无效',401);const decipher=createDecipheriv('aes-256-gcm',Buffer.from(apiV3Key),Buffer.from(resource.nonce));decipher.setAAD(Buffer.from(resource.associated_data||''));decipher.setAuthTag(data.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(data.subarray(0,-16)),decipher.final()]).toString('utf8'));}
const cents=amount=>{requireThat(typeof amount==='string'&&/^\d+(\.\d{1,2})?$/.test(amount),'支付金额格式无效');const [whole,part='']=amount.split('.');const value=Number(whole)*100+Number(part.padEnd(2,'0'));requireThat(Number.isSafeInteger(value),'支付金额无效');return value;};
const beijingDate=value=>new Date(value.getTime()+8*3600000).toISOString().slice(0,19).replace('T',' ');

export class Payments {
  constructor(config,store){this.config=config;this.store=store;this.merchants=config.merchants||[];this.alipay=new Map();this.checkouts=new Map();
    for(const m of this.merchants){requireThat(/^[a-zA-Z0-9_-]{1,64}$/.test(m.id)&&m.name&&Array.isArray(m.kinds),'收款主体配置无效',500);if(this.ready(m,'alipay'))this.alipay.set(m.id,new AlipaySdk({appId:m.alipay.appId,privateKey:m.alipay.privateKey,alipayPublicKey:m.alipay.alipayPublicKey,keyType:m.alipay.keyType||'PKCS8',signType:'RSA2',camelcase:false,timeout:10000}));}
  }
  ready(m,provider){const c=m?.[provider];if(!c?.enabled)return false;if(provider==='wechat')return !!(c.appId&&c.mchId&&c.serialNo&&c.privateKey&&c.apiV3Key?.length===32&&Object.keys(c.publicKeys||{}).length);return !!(c.appId&&c.sellerId&&c.privateKey&&c.alipayPublicKey);}
  merchant(id){return this.merchants.find(m=>m.id===id);}
  publicConfig(){return this.merchants.map(m=>({id:m.id,name:m.name,kinds:m.kinds,providers:['wechat','alipay'].filter(p=>this.ready(m,p))}));}
  validateQuoteRecipients(items){if(!Array.isArray(items))return;for(const item of items){const m=this.merchant(item.recipientId);if(m)requireThat(m.name===item.recipientName&&m.kinds.includes(item.kind),'报价收款主体或费用类型与配置不符');else requireThat(this.merchants.length===0,'请使用已配置的收款主体');}}
  options(o){return (o.quote?.items||[]).map(item=>{const m=this.merchant(item.recipientId);const matched=m&&m.name===item.recipientName&&m.kinds.includes(item.kind);return {itemId:item.id,providers:matched?['wechat','alipay'].filter(p=>this.ready(m,p)):[]};});}
  ensureAvailable(o,itemId,provider){const option=this.options(o).find(x=>x.itemId===itemId);requireThat(option?.providers.includes(provider),'官方收款通道尚未开通，请联系顾问；请勿向个人账户支付',503);}
  async wx(m,method,path,input){
    const c=m.wechat;const timestamp=String(Math.floor(Date.now()/1000)),nonce=randomBytes(16).toString('hex'),raw=input?JSON.stringify(input):'';
    const signature=sign('RSA-SHA256',Buffer.from(`${method}\n${path}\n${timestamp}\n${nonce}\n${raw}\n`),c.privateKey).toString('base64');
    const response=await fetch('https://api.mch.weixin.qq.com'+path,{method,headers:{Authorization:`WECHATPAY2-SHA256-RSA2048 mchid="${c.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${c.serialNo}",signature="${signature}"`,Accept:'application/json','Content-Type':'application/json'},body:raw||undefined,signal:AbortSignal.timeout(12000),redirect:'error'});
    const body=await response.text();verifyWechat(Object.fromEntries(response.headers),body,c.publicKeys);const data=body?JSON.parse(body):{};if(!response.ok){const error=new AppError('微信支付暂未受理，请稍后重试或联系顾问',503);error.providerCode=data.code;throw error;}return data;
  }
  async checkout(p,o,mobile){
    this.ensureAvailable(o,p.itemId,p.provider);if(this.checkouts.has(p.id))return this.checkouts.get(p.id);
    const work=(async()=>{const m=this.merchant(p.recipientId);const item=o.quote.items.find(i=>i.id===p.itemId);const subject=`鲨保保-${o.product}-${item.title}`.slice(0,100);const expiry=new Date(Math.min(Date.parse(p.createdAt)+30*60000,Date.parse(o.quote.expiresAt)));requireThat(expiry.getTime()>Date.now()+1000,'支付单已过期，请联系顾问核查并关闭后重新支付');
      if(p.provider==='wechat'){const result=await this.wx(m,'POST','/v3/pay/transactions/native',{appid:m.wechat.appId,mchid:m.wechat.mchId,description:subject,out_trade_no:p.id,time_expire:expiry.toISOString(),notify_url:`${this.config.origin}/api/payments/wechat/${m.id}`,amount:{total:p.amount,currency:'CNY'}});requireThat(typeof result.code_url==='string'&&result.code_url.startsWith('weixin://wxpay/'),'微信收银台地址无效',503);return {paymentId:p.id,provider:'wechat',qr:await QRCode.toDataURL(result.code_url,{width:320,margin:3,errorCorrectionLevel:'M'}),expiresAt:expiry.toISOString()};}
      const url=this.alipay.get(m.id).pageExecute(mobile?'alipay.trade.wap.pay':'alipay.trade.page.pay','GET',{bizContent:{out_trade_no:p.id,product_code:mobile?'QUICK_WAP_WAY':'FAST_INSTANT_TRADE_PAY',subject,total_amount:(p.amount/100).toFixed(2),time_expire:beijingDate(expiry)},notifyUrl:`${this.config.origin}/api/payments/alipay/${m.id}`});
      requireThat(new URL(url).origin==='https://openapi.alipay.com','支付宝收银台地址无效',503);return {paymentId:p.id,provider:'alipay',url,expiresAt:expiry.toISOString()};})();
    this.checkouts.set(p.id,work);const expiryTimer=setTimeout(()=>this.checkouts.delete(p.id),60000);expiryTimer.unref();try{return await work;}catch(error){this.checkouts.delete(p.id);if(error instanceof AppError)throw error;throw new AppError('支付渠道暂时不可用，请稍后重试',503);}
  }
  verifyBusiness(p,m,provider,result){
    requireThat(p.provider===provider&&p.recipientId===m.id,'支付渠道或商户不匹配',401);
    if(provider==='wechat'){requireThat(result.mchid===m.wechat.mchId&&result.appid===m.wechat.appId,'支付商户不匹配',401);requireThat(result.amount?.currency==='CNY'&&result.amount.total===p.amount,'支付金额或币种不匹配',401);}
    else{requireThat(result.app_id===m.alipay.appId&&result.seller_id===m.alipay.sellerId,'支付商户不匹配',401);requireThat(cents(result.total_amount)===p.amount,'支付金额不匹配',401);}
  }
  async notify(provider,recipientId,headers,raw){const m=this.merchant(recipientId);requireThat(this.ready(m,provider),'支付通道未配置',503);
    if(provider==='wechat'){verifyWechat(headers,raw,m.wechat.publicKeys);const envelope=JSON.parse(raw);requireThat(envelope.event_type==='TRANSACTION.SUCCESS','暂不受理该支付事件');const result=decryptWechat(envelope.resource,m.wechat.apiV3Key);const p=this.store.findPayment(result.out_trade_no);this.verifyBusiness(p,m,provider,result);requireThat(result.trade_state==='SUCCESS','支付尚未成功');this.store.paid({...p,transactionId:result.transaction_id,paidAt:result.success_time});}
    else{const params=new URLSearchParams(raw);requireThat(new Set(params.keys()).size===[...params].length,'支付参数重复',401);const result=Object.fromEntries(params);requireThat(result.sign_type==='RSA2'&&this.alipay.get(m.id).checkNotifySignV2(result),'支付签名无效',401);const p=this.store.findPayment(result.out_trade_no);this.verifyBusiness(p,m,provider,result);if(['TRADE_SUCCESS','TRADE_FINISHED'].includes(result.trade_status))this.store.paid({...p,transactionId:result.trade_no});}
  }
  async query(p){const m=this.merchant(p.recipientId);requireThat(this.ready(m,p.provider),'支付通道未配置',503);if(p.status==='paid')return;
    if(p.provider==='wechat'){const r=await this.wx(m,'GET',`/v3/pay/transactions/out-trade-no/${encodeURIComponent(p.id)}?mchid=${encodeURIComponent(m.wechat.mchId)}`);requireThat(r.out_trade_no===p.id,'支付订单不匹配',401);this.verifyBusiness(p,m,'wechat',r);if(r.trade_state==='SUCCESS')this.store.paid({...p,transactionId:r.transaction_id,paidAt:r.success_time});}
    else{const r=await this.alipay.get(m.id).exec('alipay.trade.query',{bizContent:{out_trade_no:p.id}},{validateSign:true});if(r.code!=='10000'){const error=new AppError('支付宝尚未返回可核验交易，请稍后重试',503);error.providerCode=r.sub_code;throw error;}requireThat(r.out_trade_no===p.id&&(!r.seller_id||r.seller_id===m.alipay.sellerId),'支付商户或订单不匹配',401);requireThat(cents(r.total_amount)===p.amount&&(!r.trans_currency||r.trans_currency==='CNY'),'支付金额或币种不匹配',401);if(['TRADE_SUCCESS','TRADE_FINISHED'].includes(r.trade_status))this.store.paid({...p,transactionId:r.trade_no});}
  }
  async close(p){requireThat(p.status==='pending','仅可关闭待支付单');try{await this.query(p);}catch(error){if(['ORDER_NOT_EXIST','ACQ.TRADE_NOT_EXIST'].includes(error.providerCode)){requireThat(Date.now()>Date.parse(p.createdAt)+35*60000,'官方尚未创建交易；请在支付单生成 35 分钟后核查并关闭，或使用原渠道继续支付');return;}throw error;}requireThat(this.store.findPayment(p.id).status!=='paid','该笔已成功收款，不可关闭');const m=this.merchant(p.recipientId);if(p.provider==='wechat')await this.wx(m,'POST',`/v3/pay/transactions/out-trade-no/${encodeURIComponent(p.id)}/close`,{mchid:m.wechat.mchId});else{const r=await this.alipay.get(m.id).exec('alipay.trade.close',{bizContent:{out_trade_no:p.id}},{validateSign:true});requireThat(r.code==='10000','支付宝未确认关闭，不能重新支付',503);}}
  async reconcile(){for(const p of this.store.pendingPayments(20)){this.store.markQueried(p.id);if(!this.ready(this.merchant(p.recipientId),p.provider))continue;try{await this.query(p);}catch{console.error(JSON.stringify({event:'payment_query_retry',paymentId:p.id}));}}}
}
