import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,generateKeyPairSync} from 'node:crypto';

test('HTTP authorization protects customer data, CSRF, and admin password lifecycle',async t=>{
  const {createApp}=await import('../server/app.mjs');
  const dir=mkdtempSync(path.join(tmpdir(),'shark-http-'));
  const app=await createApp({dbFile:path.join(dir,'orders.db'),dataKey:randomBytes(32),origin:'http://127.0.0.1',secureCookies:false,adminUsername:'admin',bootstrapPassword:'Initial-secure-password-123!',merchants:[]});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${app.server.address().port}`;
  const call=async(route,body,headers={})=>{const res=await fetch(url+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1',...headers},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();return {res,data};};
  assert.equal((await call('/api/admin/orders')).res.status,401);
  assert.equal((await call('/api/orders',{product:'VIES',fields:{companyName:'ABC',contactName:'A',phone:'13800138000'},consent:true},{Origin:'https://evil.example'})).res.status,403);
  const created=await call('/api/orders',{product:'VIES',fields:{companyName:'ABC',contactName:'A',phone:'13800138000'},consent:true});assert.equal(created.res.status,201);const {id,token}=created.data;
  assert.equal((await call('/api/orders/'+id)).res.status,404);
  const good=await call('/api/orders/'+id,undefined,{Authorization:'Bearer '+token});assert.equal(good.data.fields.companyName,'ABC');assert.equal(good.res.headers.get('Cache-Control'),'no-store');assert.equal(good.data.token,undefined);
  const login=await call('/api/admin/login',{username:'admin',password:'Initial-secure-password-123!'});assert.equal(login.res.status,200);const cookie=login.res.headers.get('Set-Cookie').split(';')[0];assert.ok(login.res.headers.get('Set-Cookie').includes('HttpOnly'));
  assert.equal((await call('/api/admin/orders',undefined,{Cookie:cookie})).res.status,403);
  assert.equal((await call('/api/admin/password',{current:'Initial-secure-password-123!',password:'Changed-password-secure-789!'},{Cookie:cookie})).res.status,403);
  const changed=await call('/api/admin/password',{current:'Initial-secure-password-123!',password:'Changed-password-secure-789!'},{Cookie:cookie,'X-CSRF-Token':login.data.csrf});assert.equal(changed.res.status,200);
  assert.equal((await call('/api/admin/orders',undefined,{Cookie:cookie})).res.status,401);
  const login2=await call('/api/admin/login',{username:'admin',password:'Changed-password-secure-789!'});const c2=login2.res.headers.get('Set-Cookie').split(';')[0];const listed=await call('/api/admin/orders',undefined,{Cookie:c2});assert.equal(listed.data.orders.length,1);
  const detail=await call('/api/admin/orders/'+id,undefined,{Cookie:c2});assert.equal(detail.data.fields.companyName,'ABC');
  const denied=await call('/api/admin/orders/'+id+'/paid',{}, {Cookie:c2,'X-CSRF-Token':login2.data.csrf});assert.equal(denied.res.status,404);
  const config=await call('/api/admin/config',undefined,{Cookie:c2});assert.deepEqual(config.data.merchants,[]);
  const q=await call('/api/admin/orders/'+id+'/quote',{expectedVersion:0,expiresAt:new Date(Date.now()+86400000).toISOString(),terms:'人工确认承保',items:[{kind:'premium',title:'保险费',amount:15000,recipientId:'insurer',recipientName:'测试保险机构'}]}, {Cookie:c2,'X-CSRF-Token':login2.data.csrf});assert.equal(q.res.status,200);
  const accepted=await call('/api/orders/'+id+'/accept',{version:1},{Authorization:'Bearer '+token});assert.equal(accepted.res.status,200);
  const disabled=await call('/api/orders/'+id+'/pay',{itemId:q.data.quote.items[0].id,provider:'wechat'},{Authorization:'Bearer '+token});assert.equal(disabled.res.status,503);assert.equal(app.store.get(id).payments.length,0);
});

test('repeated bad logins are rate limited and never return different account errors',async t=>{const {createApp}=await import('../server/app.mjs');const app=await createApp({dbFile:':memory:',dataKey:randomBytes(32),origin:'http://127.0.0.1',secureCookies:false,adminUsername:'admin',bootstrapPassword:'Initial-secure-password-123!',merchants:[]});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.close();});const base=`http://127.0.0.1:${app.server.address().port}`;let status;for(let i=0;i<7;i++){const r=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json'},body:JSON.stringify({username:'wrong',password:'wrong'})});status=r.status;}assert.equal(status,429);});

test('unsupported Alipay mobile payment is rejected before recording a pending transaction',async t=>{
  const {createApp}=await import('../server/app.mjs');
  const keys=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const app=await createApp({dbFile:':memory:',dataKey:randomBytes(32),origin:'http://127.0.0.1',secureCookies:false,adminUsername:'admin',bootstrapPassword:'Initial-secure-password-123!',merchants:[{id:'service',name:'测试主体',kinds:['service'],alipay:{enabled:true,products:['page'],appId:'APP1',sellerId:'SELLER1',privateKey:keys.privateKey,alipayPublicKey:keys.publicKey}}]});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.close();});
  const created=app.store.create({product:'VIES',fields:{companyName:'测试公司',contactName:'测试',phone:'13800138000'},consent:true});
  const quoted=app.store.quote(created.id,{expectedVersion:0,expiresAt:new Date(Date.now()+86400000).toISOString(),terms:'人工核保测试',items:[{kind:'service',title:'服务费',amount:100,recipientId:'service',recipientName:'测试主体'}]},'test');
  app.store.accept(created.id,1);
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const request={itemId:quoted.quote.items[0].id,provider:'alipay',mobile:true};
  const response=await fetch(base+'/api/orders/'+created.id+'/pay',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json',Authorization:'Bearer '+created.token},body:JSON.stringify(request)});
  assert.equal(response.status,503);
  assert.equal(app.store.get(created.id).payments.length,0);
  const desktop=await fetch(base+'/api/orders/'+created.id+'/pay',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json',Authorization:'Bearer '+created.token},body:JSON.stringify({...request,mobile:false})});
  assert.equal(desktop.status,200);
  assert.equal(new URL((await desktop.json()).url).searchParams.get('method'),'alipay.trade.page.pay');
  assert.equal(app.store.get(created.id).payments.length,1);
});
