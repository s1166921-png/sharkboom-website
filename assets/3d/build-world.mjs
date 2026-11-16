/** Original volumetric SharkBoom mascot and miniature maritime world.
 * Run: node assets/3d/build-world.mjs. No raster billboards or external models.
 * Natural Earth public-domain coastlines: https://www.naturalearthdata.com/about/terms-of-use/
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
const output = new T.Group(); output.name = 'SharkBoom_World';
const mat = (color, roughness=.35, metalness=0) => new T.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.7,clearcoatRoughness:.25});
const blue=mat('#0055bb',.26,.13), navy=mat('#00377c',.4), ice=mat('#f2f8ff',.32), white=mat('#ffffff',.34), orange=mat('#e64a20',.31), ink=mat('#05233c',.13), aqua=mat('#54b5e9',.26,.1), sand=mat('#e4ebf3',.48);
function mesh(geometry, material, parent, x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,w,h,d,material=white){return mesh(new T.BoxGeometry(w,h,d),material,parent,x,y,z);}
function sphere(parent,x,y,z,rx,ry,rz,material=blue){const m=mesh(new T.SphereGeometry(1,32,20),material,parent,x,y,z);m.scale.set(rx,ry,rz);return m;}
function tube(parent, points, radius, material, segments=24){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,segments,radius,6,false),material,parent);}
function fin(parent,shape,depth,material){const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,bevelSize:depth*.5,bevelThickness:depth*.5,steps:1,curveSegments:16});g.translate(0,0,-depth/2);return mesh(g,material,parent);}
function batch(group){group.updateMatrixWorld(true);const batches=new Map();const others=[];group.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){if(!batches.has(o.material))batches.set(o.material,[]);const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);batches.get(o.material).push(g);others.push(o);}});others.forEach(o=>o.removeFromParent());for(const [material,geometries]of batches){const merged=mergeGeometries(geometries.map(g=>g.index?g.toNonIndexed():g));mesh(merged,material,group);}}

// Continuous skinned body, six-bone spine. Fins and facial details move with the rig.
const shark=new T.Group();shark.name='SharkRig';output.add(shark);
const profile=new T.CatmullRomCurve3([
  [-2.12,.105,.09],[-1.8,.19,.17],[-1.3,.39,.34],[-.65,.6,.5],[.1,.72,.61],[.8,.73,.64],[1.35,.59,.51],[1.8,.39,.34],[2.04,.17,.15],[2.09,.001,.001]
].map(p=>new T.Vector3(...p)),false,'catmullrom',.25);
const segments=96,sides=64,positions=[],colors=[],indices=[],skinIndices=[],weights=[];
const bx=[1.8,.6,-.55,-1.4,-2.1,-2.75];const bones=[];for(let i=0;i<bx.length;i++){const b=new T.Bone();b.name=`Shark_Spine_${i}`;b.position.x=i?bx[i]-bx[i-1]:bx[i];if(i)bones[i-1].add(b);bones.push(b);}
for(let i=0;i<=segments;i++){const t=i/segments,p=profile.getPoint(t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;const sy=Math.cos(a);positions.push(p.x,p.y*sy+.065*Math.sin(t*Math.PI),p.z*Math.sin(a));const mix=T.MathUtils.smoothstep(sy,-.22,.16);const c=new T.Color('#f2fbff').lerp(new T.Color('#0055bb'),mix);colors.push(c.r,c.g,c.b);let k=bx.findIndex((x,n)=>n<bx.length-1&&p.x<=x&&p.x>=bx[n+1]);if(k<0)k=p.x>bx[0]?0:bx.length-2;const w=T.MathUtils.clamp((bx[k]-p.x)/(bx[k]-bx[k+1]),0,1);skinIndices.push(k,k+1,0,0);weights.push(1-w,w,0,0);if(i<segments&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}}
const bodyGeo=new T.BufferGeometry();bodyGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));bodyGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));bodyGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));bodyGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));bodyGeo.setIndex(indices);bodyGeo.computeVertexNormals();
const bodyMat=mat('#ffffff',.28,.05);bodyMat.vertexColors=true;const body=new T.SkinnedMesh(bodyGeo,bodyMat);body.name='Continuous_sculpted_body';body.castShadow=true;shark.add(body);body.add(bones[0]);body.bind(new T.Skeleton(bones));
function attach(mesh,bone){mesh.position.x-=bx[bone];bones[bone].add(mesh);}
const dorsalShape=new T.Shape();dorsalShape.moveTo(-.95,.48);dorsalShape.bezierCurveTo(-.75,.88,-.68,1.47,-.43,1.5);dorsalShape.bezierCurveTo(-.23,1.49,-.22,.9,.4,.63);dorsalShape.quadraticCurveTo(-.4,.64,-.95,.48);
attach(fin(shark,dorsalShape,.14,blue),1);
const tailShape=new T.Shape();tailShape.moveTo(0,.09);tailShape.bezierCurveTo(-.18,.25,-.6,.75,-.87,.91);tailShape.quadraticCurveTo(-1.03,1,-.94,.72);tailShape.lineTo(-.68,.08);tailShape.quadraticCurveTo(-.56,-.02,-.75,-.35);tailShape.lineTo(-.95,-.74);tailShape.quadraticCurveTo(-1.04,-.98,-.8,-.85);tailShape.bezierCurveTo(-.34,-.66,-.2,-.28,0,-.09);tailShape.closePath();const tail=fin(shark,tailShape,.115,blue);tail.position.x=-2.08;attach(tail,4);
for(const side of [-1,1]){
  const pectoral=new T.Shape();pectoral.moveTo(.15,0);pectoral.bezierCurveTo(-.08,-.18,-.68,-.86,-1.01,-.82);pectoral.quadraticCurveTo(-1.17,-.77,-.91,-.52);pectoral.quadraticCurveTo(-.56,-.04,-.43,.18);pectoral.closePath();const f=fin(shark,pectoral,.11,blue);f.position.set(-.05,-.25,side*.39);f.rotation.x=side*1.05;attach(f,1);
  const eyeGroup=new T.Group();eyeGroup.name=side<0?'Shark_Eye_Left':'Shark_Eye_Right';eyeGroup.position.set(1.26,.3,side*.475);shark.add(eyeGroup);
  const eye=sphere(eyeGroup,0,0,0,.24,.275,.105,white);eye.rotation.y=side*.28;
  const pupil=sphere(eyeGroup,.06,.005,side*.085,.125,.174,.061,ink);pupil.rotation.y=side*.25;
  sphere(eyeGroup,.09,.069,side*.136,.041,.055,.018,white);
  sphere(eyeGroup,.03,-.04,side*.143,.018,.025,.012,white);attach(eyeGroup,0);
  const brow=tube(shark,[[1.02,.61,side*.42],[1.19,.65,side*.4],[1.39,.58,side*.36]],.025,navy);attach(brow,0);
  const smile=tube(shark,[[1.88,-.12,side*.23],[1.65,-.245,side*.4],[1.36,-.29,side*.49],[1.04,-.22,side*.55]],.022,navy);attach(smile,0);
  for(let g=0;g<3;g++){const x=.24-g*.14;const line=tube(shark,[[x,.05,side*.61],[x-.045,-.075,side*.615],[x,-.19,side*.58]],.014,navy);attach(line,1);}
}
const swimTracks=[];const times=Array.from({length:49},(_,i)=>i/48*1.8);for(let i=0;i<bones.length;i++){const values=[];for(const time of times){const wave=Math.sin(time/1.8*Math.PI*2-i*.75)*[.012,.022,.075,.17,.28,.34][i];const q=new T.Quaternion().setFromEuler(new T.Euler(0,wave,.012*Math.sin(time/1.8*Math.PI*2-i)));values.push(q.x,q.y,q.z,q.w);}swimTracks.push(new T.QuaternionKeyframeTrack(`${bones[i].name}.quaternion`,times,values));}const swim=new T.AnimationClip('Shark_Organic_Swim',1.8,swimTracks);
const blink=new T.AnimationClip('Shark_Gentle_Blink',5.6,['Shark_Eye_Left','Shark_Eye_Right'].map(name=>new T.VectorKeyframeTrack(`${name}.scale`,[0,3.6,3.68,3.77,3.86,5.6],[1,1,1,1,1,1,1,.08,1,1,.08,1,1,1,1,1,1,1])));
// Export the reusable character at its own origin, including its animation.
const exporter=new GLTFExporter();await mkdir('public/studio',{recursive:true});await writeFile('public/studio/shark-mascot.glb',Buffer.from(await exporter.parseAsync(shark,{binary:true,animations:[swim,blink]})));
shark.scale.setScalar(.85);shark.position.set(3.8,.9,3);shark.rotation.y=.9;

// True ship hull, layered decks, railings, cargo and bridge; no image planes.
const ship=new T.Group();ship.name='Vessel';const hullShape=new T.Shape();hullShape.moveTo(-1.65,-.42);hullShape.quadraticCurveTo(-1.9,0,-1.65,.42);hullShape.lineTo(.95,.42);hullShape.quadraticCurveTo(1.6,.37,1.9,0);hullShape.quadraticCurveTo(1.6,-.37,.95,-.42);hullShape.closePath();
const hull=fin(ship,hullShape,.44,blue);hull.rotation.x=Math.PI/2;hull.position.y=.09;
const deck=fin(ship,hullShape,.07,ice);deck.rotation.x=Math.PI/2;deck.position.y=.34;deck.scale.set(.98,.96,1);
for(let row=0;row<3;row++)for(let col=0;col<5;col++){const color=(row+col)%5===0?orange:(row+col)%3===0?blue:ice;const x=-.9+col*.43,z=(row-1)*.24;box(ship,x,.54,z,.39,.30,.21,color);if((row+col)%3===0)box(ship,x,.83,z,.39,.27,.21,color);for(let rib=0;rib<6;rib++)box(ship,x-.16+rib*.06,.54,z+.109,.013,.26,.007,color);}
box(ship,-1.38,.61,0,.36,.55,.66,white);box(ship,-1.35,.94,0,.46,.16,.71,ice);for(const side of [-1,1])for(let w=0;w<4;w++)box(ship,-1.51+w*.1,.95,side*.362,.065,.07,.008,navy);box(ship,-1.38,1.16,0,.15,.29,.24,orange);box(ship,-1.38,1.32,0,.19,.04,.28,navy);tube(ship,[[-1.35,1.04,0],[-1.35,1.5,0]],.015,white);tube(ship,[[-1.55,1.37,0],[-1.12,1.37,0]],.014,white);
for(const side of [-1,1]){tube(ship,[[-1.7,.46,side*.39],[.9,.46,side*.39],[1.65,.46,side*.08]],.013,white);for(let i=0;i<10;i++)tube(ship,[[-1.6+i*.31,.35,side*.39],[-1.6+i*.31,.46,side*.39]],.009,white);}
batch(ship);ship.name='Vessel';output.add(ship);ship.scale.setScalar(.8);ship.position.set(-4.1,.35,-.8);ship.rotation.y=-.5;

// Geographic globe: raised, triangulated Natural Earth coastline meshes.
const globe=new T.Group();globe.name='Globe';output.add(globe);globe.position.y=1.87;const radius=1.73;const globeSea=mesh(new T.SphereGeometry(radius,80,48),blue,globe);globeSea.name='Globe_ocean';
const data=JSON.parse(await readFile('assets/3d/land.geojson','utf8'));
const landPositions=[];
const project=(lon,lat,r)=>{const p=lon*Math.PI/180,q=lat*Math.PI/180;return [r*Math.cos(q)*Math.cos(p),r*Math.sin(q),-r*Math.cos(q)*Math.sin(p)];};
function triangle(a,b,c,depth=0){const longest=Math.max(a.distanceTo(b),a.distanceTo(c),b.distanceTo(c));if(longest>9&&depth<6){const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;}for(const p of [a,b,c])landPositions.push(...project(p.x,p.y,radius+.026));}
for(const feature of data.features){const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;for(const polygon of polygons){const contour=polygon[0].slice(0,-1).map(p=>new T.Vector2(...p));if(contour.length<3)continue;const holes=polygon.slice(1).map(h=>h.slice(0,-1).map(p=>new T.Vector2(...p)));const all=[...contour,...holes.flat()];for(const face of T.ShapeUtils.triangulateShape(contour,holes))triangle(all[face[0]],all[face[1]],all[face[2]]);}}
const landGeo=new T.BufferGeometry();landGeo.setAttribute('position',new T.Float32BufferAttribute(landPositions,3));landGeo.computeVertexNormals();const landMaterial=mat('#f6fbff',.4,.02);landMaterial.side=T.DoubleSide;mesh(landGeo,landMaterial,globe).name='Raised_continents';globe.rotation.set(.05,-2.2,-.14);
// Very fine globe graticule and two flight arcs.
for(let lat=-60;lat<=60;lat+=30){const r=Math.cos(lat*Math.PI/180)*(radius+.006);const y=Math.sin(lat*Math.PI/180)*(radius+.006);const pts=Array.from({length:97},(_,i)=>[r*Math.cos(i/96*Math.PI*2),y,r*Math.sin(i/96*Math.PI*2)]);tube(globe,pts,.004,aqua,96);}

// Ceramic plinth and contiguous ocean; reflective water is animated in the renderer.
const harbor=new T.Group();harbor.name='Harbor';output.add(harbor);
mesh(new T.CylinderGeometry(5.35,5.05,.34,128),ice,harbor,0,-.32,0);
mesh(new T.CylinderGeometry(5.08,5.25,.15,128),blue,harbor,0,-.51,0);
const water=mesh(new T.CircleGeometry(5.18,160),mat('#1693cf',.21,.27),output,0,-.1,0);water.rotation.x=-Math.PI/2;water.name='Living_ocean';
for(const r of [5.21,5.3]){const torus=mesh(new T.TorusGeometry(r,.027,8,160),white,harbor,0,-.09,0);torus.rotation.x=Math.PI/2;}
const city=new T.Group();city.name='Miniature_cities';
function island(x,z,r){mesh(new T.CylinderGeometry(r,r*.9,.15,48),sand,city,x,.02,z);mesh(new T.TorusGeometry(r,.027,5,48),white,city,x,.105,z).rotation.x=Math.PI/2;}
island(-3.1,-2.6,1.13);island(3,-2.65,1.01);
for(let i=0;i<11;i++){const x=-3.75+(i%4)*.39,z=-2.1-Math.floor(i/4)*.42;const h=[.7,1.2,.9,.55,1.5,1,.65][i%7];box(city,x,h/2+.13,z,.3,h,.32,white);for(let row=0;row<Math.floor(h/.18);row++)for(let col=0;col<2;col++)box(city,x-.07+col*.14,.25+row*.18,z+.164,.058,.08,.008,aqua);}
// Customs arch, lighthouse and harbor cranes make the tiny world recognizable.
box(city,2.5,.57,-2.8,.25,1.0,.25);box(city,3.45,.57,-2.8,.25,1,.25);box(city,2.97,1.1,-2.8,1.2,.17,.34);box(city,2.97,1.27,-2.8,.8,.15,.25);
mesh(new T.CylinderGeometry(.15,.26,1.14,24),white,city,3.15,.72,-2.12);mesh(new T.CylinderGeometry(.21,.21,.18,24),orange,city,3.15,1.24,-2.12);mesh(new T.ConeGeometry(.28,.25,24),blue,city,3.15,1.47,-2.12);
for(const x of [-4.4,-3.75]){tube(city,[[x,.15,.5],[x,1.4,.5],[x+.65,1.4,.5]],.04,orange);tube(city,[[x+.55,1.4,.5],[x+.55,.65,.5]],.012,navy);box(city,x,.1,.5,.5,.11,.32,ice);}
batch(city);city.scale.setScalar(.78);output.add(city);
// All modelled geometry shares the same coordinate space and physical lighting.
output.userData={author:'SharkBoom original procedural sculpture',license:'Original model. Coastline data: Natural Earth, public domain.',sceneVersion:2};
await writeFile('public/studio/sharkboom-world.glb',Buffer.from(await exporter.parseAsync(output,{binary:true,animations:[swim,blink]})));
await writeFile('public/studio/model-info.json',JSON.stringify({version:2,models:['continuous skinned cartoon shark','container vessel','raised coastline globe','miniature city harbor','ocean platform'],animation:'Shark_Organic_Swim',spineBones:6,source:'assets/3d/build-world.mjs',coastlines:'Natural Earth public domain',rasterBillboards:0},null,2));
console.log('Created animated shark-mascot.glb and complete sharkboom-world.glb.');
