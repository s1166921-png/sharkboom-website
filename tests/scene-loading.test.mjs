import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {fetchModel} from '../app/motion-3d/model-loader.ts';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer/decoder';
import * as T from 'three';

test('server HTML contains the complete scene and starts its request before hydration',{skip:!process.env.SCENE_PREVIEW_URL},async()=>{
  const response=await fetch(process.env.SCENE_PREVIEW_URL+'/motion-3d');assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/data-testid="sculpted-world"[^>]*data-visual="complete"/);
  assert.match(html,/<picture[^>]*>.*?data:image\/webp;base64,/s,'Full scene is in HTML, not created after hydration');
  assert.match(html,/<link[^>]*rel="preload"[^>]*as="fetch"[^>]*studio\/optimized\//,'HTML starts model download');
  assert(!html.includes('SETTING SAIL'),'No loading screen in initial markup');
  const metrics=JSON.parse(await readFile(new URL('../public/studio/loading-metrics.json',import.meta.url),'utf8'));
  const modelBytes=await fetchModel(process.env.SCENE_PREVIEW_URL+metrics.world.path,process.env.SCENE_PREVIEW_URL+metrics.world.fallback);
  assert.equal(new DataView(modelBytes).getUint32(0,true),0x46546c67,'Production server actually serves and decodes the model');
});

test('production scene transport decodes gzip and preserves the original rig, materials and bounds',async()=>{
  const metrics=JSON.parse(await readFile(new URL('../public/studio/loading-metrics.json',import.meta.url),'utf8'));
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  for(const [key,originalName]of [['world','sharkboom-world'],['mascot','shark-mascot']]){
    const asset=metrics[key],packed=await readFile(new URL('../public'+asset.path,import.meta.url));
    const original=await readFile(new URL(`../public/studio/${originalName}.glb`,import.meta.url));
    assert(packed.byteLength<original.byteLength*.1,'At least 90% smaller download');
    const decoded=gunzipSync(packed);
    const [model,reference]=await Promise.all([loader.parseAsync(decoded.buffer.slice(decoded.byteOffset,decoded.byteOffset+decoded.byteLength),''),loader.parseAsync(original.buffer.slice(original.byteOffset,original.byteOffset+original.byteLength),'')]);
    assert.deepEqual(model.animations.map(x=>x.name),reference.animations.map(x=>x.name));
    let skinned=0;model.scene.traverse(o=>{if(o.isSkinnedMesh){skinned++;assert.equal(o.skeleton.bones.length,6);assert(o.geometry.getAttribute('color'));}});assert(skinned>0);
    for(const name of key==='world'?['SharkRig','Vessel','Globe','Living_ocean']:['SharkRig']){
      const live=model.scene.getObjectByName(name),before=reference.scene.getObjectByName(name);assert(live&&before,`Keep named node ${name}`);
      const actualBounds=new T.Box3().setFromObject(live),originalBounds=new T.Box3().setFromObject(before);
      assert(actualBounds.min.distanceTo(originalBounds.min)<.005,`${name} lower bounds remain within 5 mm`);
      assert(actualBounds.max.distanceTo(originalBounds.max)<.005,`${name} upper bounds remain within 5 mm`);
    }
  }
});

test('model transport handles gzip, server-decoded data, unsupported decompression and failures',async()=>{
  const plain=Buffer.from('glTF transport fixture'),packed=gzipSync(plain),requests=[];
  const server=createServer((req,res)=>{requests.push(req.url);if(req.url==='/missing'){res.writeHead(404).end();return;}res.end(req.url==='/packed'?packed:plain);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.deepEqual(Buffer.from(await fetchModel(origin+'/packed',origin+'/plain')),plain);
    assert.deepEqual(Buffer.from(await fetchModel(origin+'/plain',origin+'/plain')),plain);
    const saved=globalThis.DecompressionStream;
    try{globalThis.DecompressionStream=undefined;assert.deepEqual(Buffer.from(await fetchModel(origin+'/packed',origin+'/fallback')),plain);assert.equal(requests.at(-1),'/fallback');}finally{globalThis.DecompressionStream=saved;}
    await assert.rejects(fetchModel(origin+'/missing',origin+'/plain'),/404/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
