import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Store,requireThat,AppError,digest,secret} from './store.mjs';
import {Security} from './security.mjs';
import plans from '../shared/intake-plans.json' with {type:'json'};
import {Payments} from './payments.mjs';

const contentSecurity="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;requireThat(size<=65536,'提交内容过大',413);chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');}
function json(raw){try{return JSON.parse(raw);}catch{throw new AppError('请求内容格式无效');}}
export async function createApp(config){
  const store=new Store(config.dbFile,config.dataKey);const security=new Security(store,config);await security.initialize();const payments=new Payments(config,store);
  const send=(res,status,data,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(data));};
  const customer=(req,id)=>{const token=req.headers.authorization?.replace(/^Bearer /,'');requireThat(store.authorize(id,token),'订单不存在或访问凭据无效',404);};
  const customerView=o=>({...o,paymentOptions:payments.options(o)});
  const server=http.createServer(async(req,res)=>{
    const requestId=secret().slice(0,12);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Content-Security-Policy',contentSecurity);
    try{
      const url=new URL(req.url,'http://localhost');const route=url.pathname;const method=req.method;
      requireThat(['GET','POST'].includes(method),'请求方法不支持',405);
      if(route==='/api/health'&&method==='GET')return send(res,200,{ok:true});
      if(route.startsWith('/api/payments/')){
        requireThat(method==='POST','请求方法不支持',405);const match=route.match(/^\/api\/payments\/(wechat|alipay)\/([A-Za-z0-9_-]+)$/);requireThat(match,'接口不存在',404);const raw=await body(req);await payments.notify(match[1],match[2],req.headers,raw);if(match[1]==='alipay'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('success');}return send(res,200,{code:'SUCCESS',message:'成功'});
      }
      if(route.startsWith('/api/')&&method==='POST'){security.origin(req);requireThat(req.headers['content-type']?.split(';')[0]==='application/json','请求必须使用 JSON',415);}
      const input=method==='POST'?json(await body(req)):null;
      if(route==='/api/orders'&&method==='POST'){security.limit('submit:'+security.ip(req),10,3600);return send(res,201,store.create(input));}
      if(route==='/api/admin/login'&&method==='POST'){const login=await security.login(req,input);return send(res,200,{csrf:login.csrf,username:login.username,mustChange:login.mustChange},{'Set-Cookie':security.cookieHeader(login.token)});}
      if(route.startsWith('/api/admin/')){
        const session=security.session(req,{allowChange:['/api/admin/me','/api/admin/password','/api/admin/logout'].includes(route)});const actor=session.username;
        if(route==='/api/admin/me'&&method==='GET')return send(res,200,{username:actor,csrf:session.csrf,mustChange:!!session.must_change});
        if(route==='/api/admin/password'&&method==='POST'){security.limit('password:'+actor,6,900);await security.changePassword(session,input);return send(res,200,{ok:true},{'Set-Cookie':security.cookieHeader('',0)});}
        if(route==='/api/admin/logout'&&method==='POST'){security.logout(session);return send(res,200,{ok:true},{'Set-Cookie':security.cookieHeader('',0)});}
        if(route==='/api/admin/config'&&method==='GET')return send(res,200,{merchants:payments.publicConfig()});
        if(route==='/api/admin/orders'&&method==='GET')return send(res,200,{orders:store.list()});
        const match=route.match(/^\/api\/admin\/orders\/([A-Z0-9]+)(?:\/(quote|followup|fulfill|access|query|close-payment|amend))?$/);requireThat(match,'接口不存在',404);const [,id,action]=match;
        if(!action&&method==='GET'){const o=store.get(id);store.audit(actor,'view_order',id);return send(res,200,{...customerView(o),audit:store.auditFor(id)});}
        requireThat(method==='POST','请求方法不支持',405);
        if(action==='quote'){payments.validateQuoteRecipients(input.items);return send(res,200,store.quote(id,input,actor));}
        if(action==='followup')return send(res,200,store.followup(id,input,actor));
        if(action==='amend')return send(res,200,store.amend(id,input.reason,actor));
        if(action==='fulfill')return send(res,200,store.fulfill(id,input,actor));
        if(action==='access'){const token=secret();store.get(id);store.tx(()=>{store.db.prepare('UPDATE orders SET token_hash=? WHERE id=?').run(digest(token),id);store.audit(actor,'customer_access_rotated',id);});return send(res,200,{id,token});}
        if(action==='query'||action==='close-payment'){const p=store.findPayment(input.paymentId);requireThat(p.orderId===id,'支付单不属于该订单',404);security.limit('query:'+p.id,10,60);if(action==='query'){await payments.query(p);store.audit(actor,'query_payment',id,{paymentId:p.id});}else{await payments.close(p);store.closePayment(p.id,actor);}return send(res,200,customerView(store.get(id)));}
      }
      const match=route.match(/^\/api\/orders\/([A-Z0-9]+)(?:\/(accept|pay|query|fields))?$/);
      if(match){const [,id,action]=match;customer(req,id);if(!action&&method==='GET')return send(res,200,customerView(store.get(id)));requireThat(method==='POST','请求方法不支持',405);
        if(action==='accept')return send(res,200,customerView(store.accept(id,input.version)));
        if(action==='fields')return send(res,200,customerView(store.updateFields(id,input.fields)));
        if(action==='pay'){security.limit('pay:'+id,30,3600);const o=store.get(id);payments.ensureAvailable(o,input.itemId,input.provider,!!input.mobile);const p=store.payment(id,input.itemId,input.provider);return send(res,200,await payments.checkout(p,o,!!input.mobile));}
        if(action==='query'){const p=store.findPayment(input.paymentId);requireThat(p.orderId===id,'支付单不存在',404);security.limit('query:'+p.id,10,60);await payments.query(p);return send(res,200,customerView(store.get(id)));}
      }
      const assets={'/admin':'index.html','/admin/':'index.html','/orders':'index.html','/orders/':'index.html','/portal/app.js':'app.js','/portal/styles.css':'styles.css'};
      if(method==='GET'&&Object.hasOwn(assets,route)){const file=assets[route];const bytes=await readFile(new URL('./web/'+file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});return res.end(bytes);}
      if(route==='/api/plans'&&method==='GET')return send(res,200,plans);
      throw new AppError('页面或接口不存在',404);
    }catch(error){const known=error instanceof AppError;const status=known?error.status:500;if(status>=500)console.error(JSON.stringify({requestId,status,name:error.name}));send(res,status,{error:known?error.message:'服务暂时不可用，请稍后重试',requestId});}
  });server.requestTimeout=20000;server.headersTimeout=15000;return {server,store,payments};
}
