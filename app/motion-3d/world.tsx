"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import s from "./studio.module.css";

type Props={playing:boolean;reducedMotion:boolean;active:number;resetKey:number;onExplore:()=>void};

/** A single physically lit 3D scene. Every visible character/object is volumetric geometry. */
export function SculptedWorld({playing,reducedMotion,active,resetKey,onExplore}:Props){
  const host=useRef<HTMLDivElement>(null),root=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<"loading"|"ready"|"unavailable">("loading");
  const settings=useRef({playing,reducedMotion,active,resetKey});
  const pointer=useRef({down:false,lastX:0,lastY:0,x:0,y:0,yaw:0,pitch:0,travel:0,flourish:0});
  useEffect(()=>{settings.current={playing,reducedMotion,active,resetKey};},[playing,reducedMotion,active,resetKey]);

  useEffect(()=>{
    const target=host.current;if(!target)return;
    let disposed=false,raf=0,visible=true,cleanup:(()=>void)|undefined;
    const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:"80px"});visibility.observe(target);
    async function boot(){
      try{
        const [T,{GLTFLoader},{RoomEnvironment}]=await Promise.all([import("three"),import("three/addons/loaders/GLTFLoader.js"),import("three/addons/environments/RoomEnvironment.js")]);
        if(disposed)return;
        const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<760?1.35:1.65));renderer.outputColorSpace=T.SRGBColorSpace;
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.setClearColor(0xf5f9ff,0);
        target!.appendChild(renderer.domElement);renderer.domElement.setAttribute("aria-hidden","true");
        const scene=new T.Scene();scene.fog=new T.Fog(0xf5f9ff,30,58);
        const camera=new T.PerspectiveCamera(36,1,.1,80);
        const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
        scene.add(new T.HemisphereLight(0xe5f4ff,0x7496bb,1.4));
        const key=new T.DirectionalLight(0xfff5e8,3.2);key.position.set(-5,12,8);key.castShadow=true;key.shadow.mapSize.setScalar(innerWidth<760?1024:2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.near=.5;key.shadow.camera.far=35;key.shadow.bias=-.0004;key.shadow.normalBias=.035;key.shadow.radius=3;scene.add(key);
        const rim=new T.DirectionalLight(0x6aaaff,3);rim.position.set(6,5,-7);scene.add(rim);
        const ground=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({opacity:.14}));ground.rotation.x=-Math.PI/2;ground.position.y=-.61;ground.receiveShadow=true;scene.add(ground);
        let world:import("three").Group|null=null,mixer:import("three").AnimationMixer|null=null;
        let time=0,entrance=0,previous=0,seenReset=settings.current.resetKey,cameraYaw=.54,cameraPitch=.57,globeAngle=-2.2,flourishTime=0,needsRender=true;
        const waterUniform={value:0};
        const resources=new Set<import("three").BufferGeometry|import("three").Material>();
        const model=await new GLTFLoader().loadAsync("/studio/sharkboom-world.glb");
        if(disposed){model.scene.traverse(o=>{const m=o as import("three").Mesh;m.geometry?.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>mat.dispose());});renderer.dispose();environment.dispose();renderer.domElement.remove();return;}
        world=model.scene;scene.add(world);
        const shark=world.getObjectByName("SharkRig")!,vessel=world.getObjectByName("Vessel")!,globe=world.getObjectByName("Globe")!;
        scene.traverse(object=>{const m=object as import("three").SkinnedMesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=!m.isSkinnedMesh;resources.add(m.geometry);for(const material of Array.isArray(m.material)?m.material:[m.material])resources.add(material);}});
        const water=world.getObjectByName("Living_ocean") as import("three").Mesh<import("three").BufferGeometry,import("three").MeshPhysicalMaterial>;
        water.castShadow=false;water.material.onBeforeCompile=shader=>{
          shader.uniforms.uStudioTime=waterUniform;
          shader.vertexShader="varying vec2 vOcean;\n"+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvOcean=position.xy;");
          shader.fragmentShader="uniform float uStudioTime;varying vec2 vOcean;\n"+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
            float w1=sin(vOcean.x*8.0+uStudioTime*1.5+sin(vOcean.y*4.0))*0.055;
            float w2=cos(vOcean.y*11.0-uStudioTime*1.2+vOcean.x*2.0)*0.045;
            normal=normalize(normal+vec3(w1,w2,0.0));`);
          shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
            float c=sin(vOcean.x*12.0+sin(vOcean.y*9.0+uStudioTime*.7))+cos(vOcean.y*14.0+sin(vOcean.x*7.0-uStudioTime*.65));
            float caustic=pow(max(0.0,1.0-abs(c)*.9),7.0);
            diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.72,.93),caustic*.28);`);
        };
        mixer=new T.AnimationMixer(world);for(const clip of model.animations)mixer.clipAction(clip).play();
        // Filament arcs and gliding beacons live in world space and occlude against the globe.
        const arcs=new T.Group();scene.add(arcs);const beacons: {mesh:import("three").Mesh;curve:import("three").CatmullRomCurve3;offset:number}[]=[];
        for(let j=0;j<3;j++){
          const pts=Array.from({length:65},(_,i)=>{const t=i/64*Math.PI*1.35-.35;return new T.Vector3(Math.cos(t)*(2.22+j*.1),Math.sin(t)*1.65+1.9,Math.sin(t*1.2+j)*1.7);});
          const curve=new T.CatmullRomCurve3(pts),material=new T.MeshBasicMaterial({color:j===1?0xe64a20:0x60b7ea,transparent:true,opacity:j===1?.5:.24});
          const line=new T.Mesh(new T.TubeGeometry(curve,90,.009,5,false),material);arcs.add(line);resources.add(line.geometry);resources.add(material);
          const glow=new T.Mesh(new T.SphereGeometry(.045,12,8),new T.MeshStandardMaterial({color:j===1?0xff9560:0x98deff,emissive:j===1?0xe64a20:0x239cff,emissiveIntensity:1.8}));arcs.add(glow);beacons.push({mesh:glow,curve,offset:j*.29});resources.add(glow.geometry);resources.add(glow.material);
        }
        // Foam ribbons follow both real 3D hulls; bubbles sit behind the moving shark.
        const foamMaterial=new T.MeshBasicMaterial({color:0xe1f6ff,transparent:true,opacity:.4,depthWrite:false});
        const wakes:import("three").Mesh[]=[];
        for(let j=0;j<12;j++){const wake=new T.Mesh(new T.TorusGeometry(.13+j*.015,.012,5,24,Math.PI*1.45),foamMaterial);wake.rotation.x=-Math.PI/2;scene.add(wake);wakes.push(wake);resources.add(wake.geometry);}resources.add(foamMaterial);
        const bubbles=new T.Group();scene.add(bubbles);for(let i=0;i<16;i++){const b=new T.Mesh(new T.SphereGeometry(.025+(i%3)*.009,8,6),new T.MeshPhysicalMaterial({color:0xa8e5ff,roughness:.1,metalness:.15,transparent:true,opacity:.55}));bubbles.add(b);resources.add(b.geometry);resources.add(b.material);}
        const resize=()=>{if(disposed)return;const {width,height}=target!.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.fov=36;camera.updateProjectionMatrix();needsRender=true;};
        const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(target!);resize();
        let lost=false;const onLost=(event:Event)=>{event.preventDefault();lost=true;if(!disposed)setStatus("unavailable");};const onRestore=()=>{lost=false;if(!disposed)setStatus("ready");};renderer.domElement.addEventListener("webglcontextlost",onLost);renderer.domElement.addEventListener("webglcontextrestored",onRestore);
        cleanup=()=>{resizeObserver.disconnect();renderer.domElement.removeEventListener("webglcontextlost",onLost);renderer.domElement.removeEventListener("webglcontextrestored",onRestore);mixer?.stopAllAction();if(world)mixer?.uncacheRoot(world);resources.forEach(r=>r.dispose());key.shadow.map?.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
        const targetLook=new T.Vector3(0,.9,0);
        function frame(now:number){
          if(disposed)return;raf=requestAnimationFrame(frame);const dt=previous?Math.min((now-previous)/1000,.04):0;previous=now;
          if(!visible||document.hidden||lost)return;
          const config=settings.current,p=pointer.current,moving=config.playing&&!config.reducedMotion&&!p.down;
          if(seenReset!==config.resetKey){time=0;p.yaw=0;p.pitch=0;p.x=0;p.y=0;p.flourish=0;seenReset=config.resetKey;flourishTime=0;}
          if(moving)time+=dt;entrance=Math.min(entrance+dt,2);
          const desiredYaw=.54+p.yaw+(config.reducedMotion?0:p.x*.045+Math.sin(time*.12)*.035),desiredPitch=.57+p.pitch+(config.reducedMotion?0:p.y*.025);
          if(!needsRender&&!moving&&!p.down&&!p.flourish&&entrance>=2&&Math.abs(cameraYaw-desiredYaw)<.0001&&Math.abs(cameraPitch-desiredPitch)<.0001&&Math.abs(globeAngle-(-2.2+config.active*.64+time*.025))<.0001)return;
          if(!config.reducedMotion&&p.flourish){flourishTime+=dt;if(flourishTime>2){p.flourish=0;flourishTime=0;}}
          mixer!.setTime(time*(config.reducedMotion?0:1));waterUniform.value=time;
          const theta=.72+time*.16;
          const shipTheta=5.1+time*.085;
          const encounter=T.MathUtils.smoothstep(1-Math.acos(Math.cos(theta-shipTheta))/.7,0,1);
          shark.position.set(Math.sin(theta)*4.65,.53+Math.sin(time*1.8)*.055+encounter*1.5,Math.cos(theta)*4.65);
          shark.rotation.set(Math.sin(time*1.8)*.025,theta,Math.sin(time*1.8+.5)*.045);
          if(p.flourish&&!config.reducedMotion){const t=flourishTime/2;shark.position.y+=Math.sin(t*Math.PI)*1.2;shark.rotation.x+=Math.sin(t*Math.PI*2)*.35;shark.rotation.z+=Math.sin(t*Math.PI)*.22;}
          vessel.position.set(Math.sin(shipTheta)*4.6,-.02+Math.sin(time*1.2)*.024,Math.cos(shipTheta)*4.6);vessel.rotation.set(Math.sin(time*.9)*.018,shipTheta,Math.sin(time*1.1)*.012);
          const desiredGlobe=-2.2+config.active*.64+time*.025;globeAngle+= (desiredGlobe-globeAngle)*(config.reducedMotion?1:Math.min(dt*2,1));globe.rotation.y=globeAngle;
          const ease=1-Math.exp(-dt*4);const yaw=desiredYaw;const pitch=desiredPitch;
          cameraYaw+=(yaw-cameraYaw)*ease;cameraPitch+=(pitch-cameraPitch)*ease;const distance=18.8+(config.reducedMotion?0:1.8*(1-T.MathUtils.smoothstep(entrance/2,0,1)));
          camera.position.set(Math.sin(cameraYaw)*Math.cos(cameraPitch)*distance,Math.sin(cameraPitch)*distance,Math.cos(cameraYaw)*Math.cos(cameraPitch)*distance);camera.lookAt(targetLook);
          beacons.forEach(({mesh,curve,offset})=>mesh.position.copy(curve.getPointAt((time*.055+offset)%1)));
          wakes.forEach((wake,i)=>{const isShip=i<6,k=i%6;const angle=(isShip?shipTheta:theta)-k*.055-.08;const r=isShip?4.6:4.65;wake.position.set(Math.sin(angle)*r,-.075,Math.cos(angle)*r);wake.rotation.z=-angle;wake.scale.setScalar(.6+k*.35);});
          bubbles.children.forEach((b,i)=>{const a=theta-.18-i*.027;b.position.set(Math.sin(a)*4.65,.12+(Math.sin(time*2+i)*.5+.5)*.3,Math.cos(a)*4.65);});
          renderer.render(scene,camera);needsRender=false;
          if(root.current){root.current.dataset.phase=time.toFixed(2);root.current.dataset.yaw=p.yaw.toFixed(2);root.current.setAttribute("aria-valuenow",String(Math.round(((cameraYaw*180/Math.PI)%360+360)%360)));}
        }
        // Avoid an initial frame with a zero camera matrix.
        camera.position.set(8.1,10.2,13.4);camera.lookAt(targetLook);renderer.render(scene,camera);setStatus("ready");raf=requestAnimationFrame(frame);
      }catch(error){if(!disposed){cleanup?.();cleanup=undefined;setStatus("unavailable");console.error("3D scene initialization failed",error);}}
    }
    void boot();return()=>{disposed=true;cancelAnimationFrame(raf);visibility.disconnect();cleanup?.();};
  },[]);

  function move(event:PointerEvent<HTMLDivElement>){const p=pointer.current,rect=event.currentTarget.getBoundingClientRect();p.x=(event.clientX-rect.left)/rect.width*2-1;p.y=(event.clientY-rect.top)/rect.height*2-1;if(p.down){const dx=event.clientX-p.lastX,dy=event.clientY-p.lastY;p.yaw-=dx*.005;p.pitch=Math.max(-.22,Math.min(.4,p.pitch+dy*.002));p.travel+=Math.abs(dx)+Math.abs(dy);p.lastX=event.clientX;p.lastY=event.clientY;if(p.travel>5)onExplore();}}
  return <div className={s.world} ref={root} data-testid="sculpted-world" data-renderer={status==="ready"?"webgl-3d":status} data-playing={playing&&!reducedMotion} role="slider" aria-label="拖动旋转立体海洋世界" aria-valuemin={0} aria-valuemax={360} aria-valuenow={31} aria-describedby="sculpted-scene-help" tabIndex={0}
    onPointerDown={e=>{const p=pointer.current;p.down=true;p.lastX=e.clientX;p.lastY=e.clientY;p.travel=0;e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={move} onPointerUp={()=>{const p=pointer.current;p.down=false;if(p.travel<5&&!reducedMotion)p.flourish=1;}} onPointerCancel={()=>{pointer.current.down=false;}} onPointerLeave={()=>{if(!pointer.current.down){pointer.current.x=0;pointer.current.y=0;}}}
    onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();pointer.current.yaw+=e.key==="ArrowLeft"?-.2:.2;onExplore();}if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();pointer.current.pitch=Math.max(-.22,Math.min(.4,pointer.current.pitch+(e.key==="ArrowUp"?.1:-.1)));onExplore();}}}>
    <div className={s.canvas} ref={host}/>
    {status!=="ready"&&<div className={s.loader}>{status==="loading"?<><span className={s.loadingRing}/><b>正在驶入鲨保保的世界</b><small>SETTING SAIL…</small></>:<><b>一起，探索更远的市场。</b><p>当前设备未能开启立体场景，你仍可浏览下方保险方案。</p></>}</div>}
    <div className={s.coordinate} aria-hidden="true"><i/> SHARKBOOM OCEAN <span>31° N / 121° E</span></div>
    <span className={s.sceneCaption} aria-hidden="true">一只鲨，一起出海。</span>
    <p id="sculpted-scene-help" className={s.srOnly}>拖动改变三维视角，方向键调整镜头，点击场景与小鲨互动。可在下方暂停动画。</p>
  </div>;
}
