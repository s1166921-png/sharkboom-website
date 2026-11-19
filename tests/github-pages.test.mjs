import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';

const standalone=process.env.STANDALONE_SITE==='true';
const output=path.resolve(standalone?'out-server':'out');
const base=standalone?'':'/sharkboom-website';
const pages=standalone?['']:['','professional','ocean','editorial','motion-3d'];

test('every exported page has complete content and valid subdirectory links',async()=>{
  for(const page of pages){
    const html=await readFile(path.join(output,page,'index.html'),'utf8');
    assert(html.includes('<main'));
    assert(!html.includes('href="/motion"'));
    if(page===''||page==='motion-3d'){
      assert(!html.includes('aria-label="切换网页风格"'),'The selected 3D website has no template switcher');
      for(const route of ['professional','ocean','editorial'])assert(!html.includes(`href="${base}/${route}"`),'The selected 3D website has no archived-template links');
    }
    for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)(?:[^"]*)"/g)){
      const pathname=match[1];
      assert(pathname.startsWith(base+'/'),`Unprefixed first-party URL ${pathname} in ${page||'home'}`);
      const relative=decodeURI(pathname.slice(base.length));
      const filename=path.extname(relative)?relative:relative+'/index.html';
      await access(path.join(output,filename));
    }
  }
});

test('the standalone website publishes only the selected 3D homepage',{skip:!standalone},async()=>{
  for(const route of ['professional','ocean','editorial','motion-3d'])await assert.rejects(access(path.join(output,route,'index.html')));
  const html=await readFile(path.join(output,'index.html'),'utf8');
  assert(!html.includes('/sharkboom-website/'),'The server deployment does not depend on the GitHub subdirectory');
  assert(html.includes('href="tel:19386967340"'));
  assert(html.includes('href="mailto:huan@seamew.net"'));
  await access(path.join(output,'contact/wechat-sharkboom.jpg'));
});

test('the exported 3D homepage retains immediate visuals and the compressed model',async()=>{
  const html=await readFile(path.join(output,'index.html'),'utf8');
  assert.match(html,/data-testid="sculpted-world"[^>]*data-visual="complete"/);
  assert.match(html,/data-playing="true"/);
  assert(html.includes('data:image/webp;base64,'));
  assert(html.includes('href="'+base+'/studio/optimized/'));
  assert(!html.includes('DRAG TO EXPLORE'));
  const model=html.match(/href="([^"]+\.glb\.bin)"/)?.[1];
  assert(model);
  const bytes=await readFile(path.join(output,model.slice(base.length)));
  assert.equal(bytes[0],0x1f);assert.equal(bytes[1],0x8b);
});

test('exported styles reference an existing self-hosted font',async()=>{
  const directory=path.join(output,'_next/static');
  async function visit(folder){const files=[];for(const entry of await readdir(folder,{withFileTypes:true})){const name=path.join(folder,entry.name);if(entry.isDirectory())files.push(...await visit(name));else if(name.endsWith('.css'))files.push(name);}return files;}
  const css=(await Promise.all((await visit(directory)).map(file=>readFile(file,'utf8')))).join('\n');
  assert(css.includes(base+'/motion/display.woff2'));
  await access(path.join(output,'motion/display.woff2'));
});
