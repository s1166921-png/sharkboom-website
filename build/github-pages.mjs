import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {access,cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';

const repository=process.env.GITHUB_REPOSITORY ?? 's1166921-png/sharkboom-website';
const [owner,name]=repository.split('/');
const root=fileURLToPath(new URL('../',import.meta.url));
const standalone=process.env.STANDALONE_SITE==='true';
const basePath=standalone?'':process.env.GITHUB_PAGES_BASE_PATH ?? (name===`${owner}.github.io`?'':`/${name}`);
const pagesEnv={...process.env,GITHUB_PAGES:'true',GITHUB_PAGES_BASE_PATH:basePath,GITHUB_PAGES_ORIGIN:process.env.GITHUB_PAGES_ORIGIN ?? `https://${owner}.github.io`};
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/vinext/dist/cli.js',import.meta.url)),'build'],{
  stdio:'inherit',
  env:pagesEnv,
});
if(result.status!==0)process.exit(result.status ?? 1);

// Export complete server-rendered documents with their embedded React payloads.
// This avoids vinext beta's incomplete subdirectory prerendering on Windows.
Object.assign(process.env,pagesEnv);
const outputName=standalone?'out-server':'out';
const output=path.resolve(root,outputName);
if(path.dirname(output)!==path.resolve(root)||path.basename(output)!==outputName)throw new Error('Unexpected export directory');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const client=path.join(root,'dist/client');
for(const entry of await readdir(client)){
  if(entry==='.vite'||entry===basePath.split('/').filter(Boolean)[0]||entry==='vinext-client-entry-manifest.json')continue;
  await cp(path.join(client,entry),path.join(output,entry),{recursive:true});
}
if(basePath)await cp(path.join(client,basePath.replace(/^\//,''),'_next'),path.join(output,'_next'),{recursive:true});

// The Node runtime resolves public assets beneath its static prefix. Pages
// needs their real on-disk URLs because it has no runtime fallback.
async function normalizeCssPublicUrls(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const filename=path.join(directory,entry.name);
    if(entry.isDirectory()){await normalizeCssPublicUrls(filename);continue;}
    if(!entry.name.endsWith('.css'))continue;
    let css=await readFile(filename,'utf8');
    const prefix=basePath+'/_next/static/';
    const urls=[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match=>match[1]);
    for(const url of urls){
      if(!url.startsWith(prefix))continue;
      const relative=url.slice(prefix.length);
      try{await access(path.join(output,relative));css=css.replaceAll(url,basePath+'/'+relative);}catch{}
    }
    await writeFile(filename,css);
  }
}
await normalizeCssPublicUrls(path.join(output,'_next'));

const {startProdServer}=await import('vinext/server/prod-server');
const {server,port}=await startProdServer({port:0,host:'127.0.0.1',outDir:path.join(root,'dist'),noCompression:true,silent:true});
try{
  for(const route of standalone?['/']:['/','/professional/','/ocean/','/editorial/','/motion-3d/']){
    const response=await fetch(`http://127.0.0.1:${port}${basePath}${route}`);
    if(!response.ok)throw new Error(`Cannot export ${route}: HTTP ${response.status}`);
    const html=await response.text();
    if(!html.includes('<main')||html.includes('需要登录'))throw new Error(`Incomplete export for ${route}`);
    const directory=path.join(output,route.replace(/^\//,''));
    await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,'index.html'),html);
    console.log(`Exported ${basePath}${route}`);
  }
  await writeFile(path.join(output,'.nojekyll'),'');
  await writeFile(path.join(output,'404.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面未找到 · 鲨保保</title><body style="font-family:Arial,sans-serif;max-width:640px;margin:15vh auto;padding:24px;color:#0055bb"><h1>这个页面暂时找不到。</h1><p><a href="${basePath}/">返回鲨保保首页 →</a></p></body></html>`);
}finally{
  server.closeAllConnections();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
console.log(`${standalone?'Standalone':'GitHub Pages'} static website ready in ${outputName}/`);
