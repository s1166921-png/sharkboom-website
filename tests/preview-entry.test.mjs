import {test} from 'node:test';
import assert from 'node:assert/strict';

const origin=process.env.SCENE_PREVIEW_URL;

test('the shared homepage opens the latest complete 3D preview',{skip:!origin},async()=>{
  const response=await fetch(origin+'/');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/data-testid="sculpted-world"[^>]*data-visual="complete"/,'Opening the shared root URL must show the latest scene');
});

test('all five designs remain reachable from every preview',{skip:!origin},async()=>{
  const pages=[['/professional','为每一次出海'],['/ocean','跨越边界'],['/editorial','跨境经营'],['/motion','motion-title'],['/motion-3d','sculpted-world']];
  for(const [path,identity] of pages){
    const response=await fetch(origin+path);
    assert.equal(response.status,200,`${path} remains available`);
    const html=await response.text();
    assert(html.includes(identity),`${path} retains its design`);
    const nav=html.match(/<nav[^>]*aria-label="切换网页风格"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert(nav,`${path} has a preview selector`);
    for(const [destination] of pages) assert(nav.includes(`href="${destination}"`),`${path} links to ${destination}`);
  }
});
