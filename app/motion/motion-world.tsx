"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import s from "./motion.module.css";

type WorldProps = { playing:boolean; reducedMotion:boolean; active:number; resetKey:number; onExplore:()=>void };

/** A real rotating WebGL globe with independent art layers on a depth-sorted orbit. */
export function MotionWorld({playing,reducedMotion,active,resetKey,onExplore}:WorldProps) {
  const host=useRef<HTMLDivElement>(null);
  const scene=useRef<HTMLDivElement>(null);
  const shark=useRef<HTMLImageElement>(null);
  const ship=useRef<HTMLImageElement>(null);
  const phase=useRef(0);
  const pointer=useRef({x:0,y:0,down:false,lastX:0,travel:0});
  const settings=useRef({playing,reducedMotion,active});
  const [ready,setReady]=useState(false);
  useEffect(()=>{settings.current={playing,reducedMotion,active};},[playing,reducedMotion,active]);
  useEffect(()=>{phase.current=0;pointer.current.x=0;pointer.current.y=0;},[resetKey]);

  useEffect(()=>{
    const target=host.current;
    if(!target)return;
    let disposed=false,visible=true,raf=0,previous=0;
    let draw:((angle:number,dt:number)=>void)|null=null;
    let release:(()=>void)|null=null;
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:"80px"});
    if(scene.current)observer.observe(scene.current);

    function positionSprite(el:HTMLImageElement|null,angle:number,kind:"ship"|"shark") {
      if(!el)return;
      const mobile=window.innerWidth<761;
      const depth=Math.sin(angle),x=50+(mobile?25:34)*Math.cos(angle);
      const y=kind==="ship"&&!mobile?49+12*depth:57+16*depth;
      const scale=.72+(depth+1)*.14;
      const facing=Math.sin(angle)>0?1:-1;
      el.style.left=`${x}%`;
      el.style.top=`${y}%`;
      el.style.transform=`translate(-50%,-50%) scale(${scale}) scaleX(${facing}) rotate(${Math.cos(angle)*-3}deg)`;
      el.style.zIndex=depth>-.08?"4":"1";
      el.style.opacity=String(.82+(depth+1)*.09);
    }
    function tick(now:number){
      if(disposed)return;
      const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;
      if(visible&&!document.hidden){
        const config=settings.current;
        if(config.playing&&!config.reducedMotion&&!pointer.current.down)phase.current+=dt*.19;
        positionSprite(ship.current,2.35-phase.current,"ship");
        positionSprite(shark.current,.66+phase.current,"shark");
        scene.current?.style.setProperty("--scene-x",`${pointer.current.x*7}px`);
        scene.current?.style.setProperty("--scene-y",`${pointer.current.y*3}px`);
        draw?.(phase.current,dt);
        if(scene.current){
          scene.current.dataset.phase=phase.current.toFixed(3);
          scene.current.setAttribute("aria-valuenow",String(Math.round((phase.current*180/Math.PI%360+360)%360)));
        }
      }
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);

    async function initialize(){
      try {
        const T=await import("three");
        if(disposed)return;
        const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.25:1.75));
        renderer.setClearColor(0x000000,0);
        renderer.outputColorSpace=T.SRGBColorSpace;
        target!.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-hidden","true");
        const world=new T.Scene();
        const camera=new T.OrthographicCamera(-6,6,2.4,-2.4,.1,50);
        camera.position.set(0,0,12);
        const geometry=new T.SphereGeometry(1.65,64,40);
        const texture=new T.TextureLoader().load("/motion/earth-map.webp",()=>{
          if(!disposed){renderer.render(world,camera);setReady(true);}
        });
        texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
        const material=new T.MeshPhysicalMaterial({map:texture,roughness:.25,metalness:.12,clearcoat:1,clearcoatRoughness:.1});
        const globe=new T.Mesh(geometry,material);
        globe.position.y=.18;
        globe.rotation.z=-.08;
        world.add(globe);
        world.add(new T.HemisphereLight(0xffffff,0x75baff,3.1));
        const key=new T.DirectionalLight(0xf7fbff,3.3);key.position.set(-3,4,6);world.add(key);
        const edge=new T.DirectionalLight(0x399bff,2);edge.position.set(4,0,-2);world.add(edge);
        const shellMaterial=new T.ShaderMaterial({
          uniforms:{tint:{value:new T.Color(0x55bcff)}},
          vertexShader:"varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
          fragmentShader:"uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float f=pow(1.0-abs(dot(normalize(n),normalize(v))),3.2);gl_FragColor=vec4(tint,f*0.58);}",
          transparent:true,depthWrite:false,side:T.FrontSide,
        });
        const shell=new T.Mesh(new T.SphereGeometry(1.69,48,32),shellMaterial);shell.position.y=.18;world.add(shell);
        const gridMaterial=new T.ShaderMaterial({
          vertexShader:"varying vec2 uv2;void main(){uv2=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
          fragmentShader:"varying vec2 uv2;void main(){vec2 p=uv2*vec2(24.0,12.0);vec2 g=abs(fract(p-.5)-.5)/fwidth(p);float line=1.0-min(min(g.x,g.y),1.0);gl_FragColor=vec4(.65,.88,1.0,line*.28);}",
          transparent:true,depthWrite:false,
        });
        const grid=new T.Mesh(new T.SphereGeometry(1.657,48,32),gridMaterial);globe.add(grid);
        const pointCount=76,coordinates=new Float32Array(pointCount*3);
        const dots=new T.Points(new T.BufferGeometry().setAttribute("position",new T.BufferAttribute(coordinates,3)),new T.PointsMaterial({color:0xff7a32,size:.055,transparent:true,opacity:.8,depthWrite:false}));
        world.add(dots);
        let lastDrawAngle=NaN,lastDrawActive=-1,activeRotation=0;
        function resize(){
          const box=target!.getBoundingClientRect();
          if(box.width<1||box.height<1)return;
          const halfHeight=6*box.height/box.width;
          const mobile=window.innerWidth<761;
          globe.scale.setScalar(mobile?1:1.5/1.65);shell.scale.copy(globe.scale);
          globe.position.y=mobile?.18:.35;shell.position.y=globe.position.y;
          camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
          renderer.setSize(box.width,box.height);
          lastDrawAngle=NaN;
        }
        const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(target!);resize();
        const contextLost=(event:Event)=>{event.preventDefault();if(!disposed)setReady(false);};
        renderer.domElement.addEventListener("webglcontextlost",contextLost);
        renderer.domElement.addEventListener("webglcontextrestored",()=>{if(!disposed)setReady(true);});
        draw=(angle,dt)=>{
          const cameraMoving=Math.abs(pointer.current.x*.22-camera.position.x)>.0001||Math.abs(pointer.current.y*.1-camera.position.y)>.0001;
          const activeMoving=Math.abs(settings.current.active*.48-activeRotation)>.0001;
          if(angle===lastDrawAngle&&settings.current.active===lastDrawActive&&!cameraMoving&&!activeMoving)return;
          lastDrawAngle=angle;lastDrawActive=settings.current.active;
          activeRotation=settings.current.reducedMotion?settings.current.active*.48:activeRotation+(settings.current.active*.48-activeRotation)*Math.min(dt*3,1);
          globe.rotation.y=angle*.7+activeRotation;
          camera.position.x+=(pointer.current.x*.22-camera.position.x)*Math.min(dt*5,1);
          camera.position.y+=(pointer.current.y*.1-camera.position.y)*Math.min(dt*5,1);
          camera.lookAt(0,0,0);
          for(let i=0;i<pointCount;i++){
            const a=angle*1.6+i/pointCount*Math.PI*2;
            coordinates[i*3]=4.8*Math.cos(a);
            coordinates[i*3+1]=-.5+.86*Math.sin(a);
            coordinates[i*3+2]=Math.sin(a)*.4;
          }
          dots.geometry.attributes.position.needsUpdate=true;
          renderer.render(world,camera);
        };
        release=()=>{
          resizeObserver.disconnect();texture.dispose();
          world.traverse(object=>{
            const item=object as import("three").Mesh;
            item.geometry?.dispose();
            if(item.material){for(const mat of Array.isArray(item.material)?item.material:[item.material])mat.dispose();}
          });
          renderer.dispose();renderer.domElement.remove();
        };
        if(disposed){release();release=null;}
      }catch{
        // The supplied static globe and independent scene layers remain usable without WebGL.
        if(!disposed)setReady(false);
      }
    }
    void initialize();
    return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();draw=null;release?.();};
  },[]);

  function move(event:PointerEvent<HTMLDivElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    if(!settings.current.reducedMotion){
      pointer.current.x=(event.clientX-rect.left)/rect.width*2-1;
      pointer.current.y=(event.clientY-rect.top)/rect.height*2-1;
    }
    if(pointer.current.down){
      const delta=event.clientX-pointer.current.lastX;
      phase.current+=delta*.008;
      pointer.current.travel+=Math.abs(delta);
      pointer.current.lastX=event.clientX;
      if(pointer.current.travel>5)onExplore();
    }
  }

  return <div className={s.world} ref={scene} data-testid="motion-world" data-renderer={ready?"webgl":"lightweight"} data-playing={playing&&!reducedMotion} role="slider" aria-label="旋转环球场景" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0} aria-describedby="motion-scene-help" tabIndex={0}
    onPointerMove={move}
    onPointerDown={e=>{pointer.current.down=true;pointer.current.lastX=e.clientX;pointer.current.travel=0;e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerUp={()=>{pointer.current.down=false;}}
    onPointerCancel={()=>{pointer.current.down=false;}}
    onPointerLeave={()=>{if(!pointer.current.down){pointer.current.x=0;pointer.current.y=0;}}}
    onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();phase.current+=e.key==="ArrowLeft"?-.2:.2;onExplore();}}}>
    <div className={s.worldLayers}>
      <picture><source media="(max-width:760px)" srcSet="/motion/stage-mobile.webp" width="1774" height="887"/><img className={s.stageArt} src="/motion/stage-wide.webp" srcSet="/motion/stage-wide-small.webp 960w, /motion/stage-wide.webp 2172w" sizes="100vw" width="2172" height="724" alt="" fetchPriority="high" draggable={false}/></picture>
      <img className={`${s.globeFallback} ${ready?s.hiddenGlobe:""}`} src="/motion/globe.webp" width="1024" height="1024" alt="" draggable={false}/>
      <div className={s.globeCanvas} ref={host}/>
      <img className={s.orbitShip} ref={ship} src="/motion/ship.webp" srcSet="/motion/ship-small.webp 640w, /motion/ship.webp 1152w" sizes="(max-width:760px) 39vw,32vw" width="1152" height="690" alt="" draggable={false}/>
      <img className={s.orbitShark} ref={shark} src="/motion/shark.webp" srcSet="/motion/shark-small.webp 640w, /motion/shark.webp 1152w" sizes="(max-width:760px) 39vw,27vw" width="1152" height="691" alt="" draggable={false}/>
    </div>
    <p id="motion-scene-help" className={s.srOnly}>拖动场景或使用左右方向键探索，自动环游可在场景下方暂停。</p>
  </div>;
}
