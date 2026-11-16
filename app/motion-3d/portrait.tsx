"use client";
import { useEffect, useRef, useState } from "react";
import { Rotate3D } from "lucide-react";
import s from "./studio.module.css";
import { MASCOT_MODEL,MASCOT_FALLBACK } from "./model-assets";
import { fetchModel } from "./model-loader";
import { MASCOT_POSTER } from "./poster-assets";

/** Lazy second view of the SAME exported character, with an independent turntable. */
export function MascotPortrait({reducedMotion}:{reducedMotion:boolean}){
  const host=useRef<HTMLDivElement>(null),spin=useRef(0),reduced=useRef(reducedMotion);
  const [ready,setReady]=useState(false);
  useEffect(()=>{reduced.current=reducedMotion;},[reducedMotion]);
  useEffect(()=>{
    const element=host.current;if(!element)return;
    let disposed=false,visible=false,started=false,raf=0,release:(()=>void)|undefined;
    async function start(){
      const bytes=fetchModel(MASCOT_MODEL,MASCOT_FALLBACK);void bytes.catch(()=>{});
      const [T,{GLTFLoader},{RoomEnvironment},{MeshoptDecoder}]=await Promise.all([import("three"),import("three/addons/loaders/GLTFLoader.js"),import("three/addons/environments/RoomEnvironment.js"),import("meshoptimizer/decoder")]);
      if(disposed)return;
      const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(31,1,.1,30);camera.position.set(4.5,2.3,8);camera.lookAt(-.35,.2,0);
      const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
      scene.add(new T.HemisphereLight(0xffffff,0x98c1ee,1.5));const light=new T.DirectionalLight(0xfff7ee,2.7);light.position.set(-3,5,5);scene.add(light);const rim=new T.DirectionalLight(0x72b9ff,2);rim.position.set(4,3,-3);scene.add(rim);
      const model=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await bytes,"");const shark=model.scene;scene.add(shark);shark.rotation.y=-.15;
      const mixer=new T.AnimationMixer(shark);model.animations.forEach(clip=>mixer.clipAction(clip).play());
      const resize=()=>{const r=element!.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(element!);resize();
      release=()=>{ro.disconnect();mixer.stopAllAction();mixer.uncacheRoot(shark);shark.traverse(o=>{const m=o as import("three").Mesh;m.geometry?.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());});env.dispose();renderer.dispose();renderer.domElement.remove();};
      if(disposed){release();return;}element!.appendChild(renderer.domElement);renderer.domElement.setAttribute("aria-hidden","true");setReady(true);
      let previous=0,time=0,angle=-.15;
      renderer.render(scene,camera);
      const frame=(now:number)=>{if(disposed)return;raf=requestAnimationFrame(frame);const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;if(!visible||document.hidden)return;if(!reduced.current)time+=dt;mixer.setTime(time);const target=-.15+spin.current;angle+=(target-angle)*(reduced.current?1:Math.min(dt*3,1));shark.rotation.y=angle+(reduced.current?0:Math.sin(time*.5)*.08);shark.position.y=reduced.current?0:Math.sin(time*1.4)*.06;renderer.render(scene,camera);};raf=requestAnimationFrame(frame);
    }
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible&&!started){started=true;void start().catch(()=>setReady(false));}},{rootMargin:"80px"});io.observe(element);
    return()=>{disposed=true;cancelAnimationFrame(raf);io.disconnect();release?.();};
  },[]);
  return <div className={s.portrait} data-ready={ready}><img className={s.portraitPoster} src={MASCOT_POSTER} width="416" height="285" alt="" aria-hidden="true" decoding="sync"/><div ref={host} className={s.portraitCanvas} role="img" aria-label="鲨保保卡通鲨鱼，圆头白肚皮，蓝色背鳍与分叉尾鳍"/><button className={s.turnButton} onClick={()=>{spin.current+=Math.PI*2;}} aria-label="让卡通鲨鱼转个身"><Rotate3D size={17}/>让小鲨转个身</button></div>;
}
