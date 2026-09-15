import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,OffthreadVideo,Img,Sequence,staticFile,useCurrentFrame,interpolate,Easing,delayRender,continueRender,cancelRender} from 'remotion';
import {Gif} from '@remotion/gif';
import {DATA,FRAME_COLORS} from './data';
import {LAYOUT,MEDIA,fitMedia} from './layout.ts';

const INK='#0C2B24',PAPER='#F7FFFC',ACCENT='#17613B';
export const fonts=`@font-face{font-family:MuseoDisplay;src:url('${staticFile('fonts/Museo700-Regular.otf')}');font-weight:700;font-display:block;}
@font-face{font-family:MuseoText;src:url('${staticFile('fonts/MuseoSansRounded700.otf')}');font-weight:700;font-display:block;}
@font-face{font-family:MuseoLight;src:url('${staticFile('fonts/Museo300-Regular.otf')}');font-weight:300;font-display:block;}`;
const ease=(f:number,start=0,n=20)=>interpolate(f,[start,start+n],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,1,.36,1)});
type Scene=typeof DATA.scenes[number];

export function useFontsAndQA(qa:boolean,frame:number){
 const [handle]=useState(()=>delayRender('Museo y composición'));
 useEffect(()=>{let cancelled=false;
 Promise.all([document.fonts.load('700 90px MuseoDisplay'),document.fonts.load('700 62px MuseoText'),document.fonts.load('300 54px MuseoLight')]).then(()=>document.fonts.ready).then(()=>{
  if(cancelled)return;
  if(qa){
   const errors:string[]=[];
   const contains=(a:DOMRect,b:DOMRect)=>b.left>=a.left-1&&b.top>=a.top-1&&b.right<=a.right+1&&b.bottom<=a.bottom+1;
   const visible=(el:Element)=>{let o=1;for(let e:Element|null=el;e;e=e.parentElement)o*=Number(getComputedStyle(e).opacity);return o>.02;};
   for(const el of document.querySelectorAll('[data-text],[data-asset]')){
    if(!visible(el))continue;const region=el.closest('[data-region]');if(!region){errors.push('Sin región');continue;}
    const rect=region.getBoundingClientRect();
    if(!contains(rect,el.getBoundingClientRect()))errors.push('Fuera de región: '+(el.textContent||el.getAttribute('data-asset')));
    if(el.hasAttribute('data-text')){const r=document.createRange();r.selectNodeContents(el);for(const box of r.getClientRects())if(box.width&&box.height&&!contains(rect,box))errors.push('Texto desbordado: '+el.textContent);}
    if(el.hasAttribute('data-ratio')){const b=el.getBoundingClientRect();if(Math.abs(b.width/b.height-Number(el.getAttribute('data-ratio')))>0.002)errors.push('Proporción alterada');}
   }
   const words=[...document.querySelectorAll('[data-word]')];
   if(new Set(words.map(el=>Math.round(el.getBoundingClientRect().top))).size>2)errors.push('Más de dos líneas');
   if(document.querySelectorAll('[data-active="true"]').length!==DATA.words.filter(w=>frame>=w.from&&frame<w.to).length)errors.push('Palabra activa incorrecta');
   console.log('__EDUCA_QA__'+JSON.stringify({frame,errors,fonts:document.fonts.status}));
  }
  continueRender(handle);
 }).catch(cancelRender);return()=>{cancelled=true;};},[handle,qa,frame]);
}
const Label:React.FC<{children:React.ReactNode}>=({children})=><div data-text style={{fontFamily:'MuseoText',fontSize:28,fontWeight:700,letterSpacing:1.9,color:ACCENT,lineHeight:1.2}}>{children}</div>;
const Heading:React.FC<{children:React.ReactNode;size?:number;light?:boolean}>=({children,size=74,light})=><div data-text style={{fontFamily:light?'MuseoLight':'MuseoDisplay',fontWeight:light?300:700,fontSize:size,letterSpacing:-1.4,lineHeight:1.05}}>{children}</div>;
const Reveal:React.FC<{children:React.ReactNode;delay?:number}>=({children,delay=0})=>{const p=ease(useCurrentFrame(),delay,18);return <div style={{opacity:p,transform:`translateY(${14*(1-p)}px)`,clipPath:`inset(0 0 ${100*(1-p)}% 0)`}}>{children}</div>;};

export const Media:React.FC<{src:string;w:number;h:number}>=({src,w,h})=>{
 const m=MEDIA[src];if(!m)throw Error('Falta medición: '+src);const size=fitMedia(m,w,h);
 return <div data-asset={src} data-ratio={m.width/m.height} style={{...size,flexShrink:0,display:'flex'}}>{m.kind==='gif'?<Gif src={staticFile(src)} width={size.width} height={size.height} fit="contain"/>:m.kind==='video'?<OffthreadVideo muted src={staticFile(src)} style={{...size,objectFit:'contain',display:'block'}}/>:<Img src={staticFile(src)} style={{...size,objectFit:'contain',display:'block'}}/>}</div>;
};
const Content:React.FC<{scene:Scene}>=({scene})=>{
 const f=useCurrentFrame(),beat=(k:string)=>Math.max(0,((scene.beats as Record<string,number>)[k]??scene.from)-scene.from);
 if(scene.kind==='countdown')return <><Label>PREPARARSE A TIEMPO</Label><div style={{height:386,display:'flex',alignItems:'center',justifyContent:'space-between',gap:30}}>
  <div style={{display:'flex',flexDirection:'column',gap:16}}><Reveal><Heading size={66}>Tenés que<br/>salir de casa.</Heading></Reveal><Reveal delay={beat('cinco')}><div style={{display:'flex',alignItems:'baseline',gap:18}}><Heading size={166}>5</Heading><Heading size={52} light>minutos</Heading></div></Reveal></div>
  <svg width="186" height="186" viewBox="0 0 186 186" style={{flexShrink:0}}><circle cx="93" cy="93" r="82" fill="#E6F0EB"/><circle cx="93" cy="93" r="80" stroke={ACCENT} strokeWidth="5" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1-ease(f,4,30)} transform="rotate(-90 93 93)"/><path d="M93 42V93L126 113" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none"/><circle cx="93" cy="93" r="5" fill={INK}/></svg>
 </div></>;
 if(scene.kind==='question')return <><Label>LO ESENCIAL, A MANO</Label><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flex:1}}><Reveal delay={3}><Heading size={77}>¿Qué<br/>llevarías?</Heading></Reveal><Reveal delay={6}><Media src={scene.media!} w={295} h={348}/></Reveal></div></>;
 if(scene.kind==='flood')return <><Label>PREVENCIÓN DE INUNDACIONES</Label><Reveal delay={2}><Heading size={64}>En cualquier hogar.</Heading></Reveal><Reveal delay={5}><div style={{display:'flex',justifyContent:'center'}}><Media src={scene.media!} w={760} h={340}/></div></Reveal></>;
 if(scene.kind==='rain')return <div style={{display:'flex',gap:28,alignItems:'center',justifyContent:'space-between',height:'100%'}}><div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:450}}><Label>CLIMATOLOGÍA<br/>Y PREVENCIÓN</Label><Reveal delay={2}><Heading size={67}>Lluvias<br/>muy intensas.</Heading></Reveal><Reveal delay={beat('nino')}><Heading size={45} light>El Niño</Heading></Reveal></div><Reveal delay={5}><Media src={scene.media!} w={252} h={420}/></Reveal></div>;
 if(scene.kind==='uncertainty')return <><Label>LO QUE NO PODEMOS ANTICIPAR</Label><Heading size={76}>¿Pasará?<br/>¿Cuándo?</Heading></>;
 if(scene.kind==='choice')return <><Label>SÍ PODEMOS DECIDIR</Label><Heading size={68}>Cómo nos<br/>encuentre.</Heading><div style={{display:'flex',gap:18}}>{['preparados','improvisando'].map((k,i)=><Reveal key={k} delay={beat(k)}><div style={{padding:'13px 16px',background:i?'#E7EFEB':'#FFF6C4',borderRadius:8}}><Heading size={34} light>{scene.copy?.options?.[i]}</Heading></div></Reveal>)}</div></>;
 return <><Label>LA PREPARACIÓN EMPIEZA ANTES</Label><Reveal delay={3}><Heading size={89}>Elegí estar<br/>preparado.</Heading></Reveal><Reveal delay={beat('mira')}><Heading size={42} light>Mirá el video completo<br/>en EducaPlay.</Heading></Reveal></>;
};
const SceneLayer:React.FC<{scene:Scene}>=({scene})=>{const f=useCurrentFrame(),p=ease(f,0,10),out=1-ease(f,scene.to-scene.from,10);return <AbsoluteFill style={{padding:'44px 40px 34px',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center',gap:24,opacity:p*out,transform:`translateY(${10*(1-p)}px)`}}><Content scene={scene}/></AbsoluteFill>;};
const Reel:React.FC<{qa:boolean}>=({qa})=>{
 const frame=useCurrentFrame();useFontsAndQA(qa,frame);const p=ease(frame,0,19),r=LAYOUT.card,c=LAYOUT.captions,page=DATA.captions.find(p=>frame>=p.from&&frame<p.to);
 return <AbsoluteFill style={{overflow:'hidden',fontFamily:'MuseoText',fontWeight:700,color:INK}}><style>{fonts}</style><OffthreadVideo src={staticFile(DATA.master)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
 <div data-region="card" style={{position:'absolute',inset:`${r.y}px auto auto ${r.x}px`,width:r.width,height:r.height,borderRadius:30,background:PAPER,boxShadow:'0 14px 40px rgba(12,43,36,.13)',overflow:'hidden',opacity:p,transform:`translateY(${22*(1-p)}px) scale(${.985+.015*p})`,transformOrigin:'center'}}>
 <div style={{height:14,display:'flex',position:'relative',zIndex:2}}>{FRAME_COLORS.map((color,i)=><div key={color} style={{flex:1,background:color,transform:`scaleX(${ease(frame,3+i*3,16)})`,transformOrigin:'left'}}/>)}</div>
 {DATA.scenes.map(s=><Sequence key={s.key} from={s.from} durationInFrames={Math.min(s.to+10,DATA.durationInFrames)-s.from}><SceneLayer scene={s}/></Sequence>)}
 </div>
 {page&&<div data-region="captions" style={{position:'absolute',inset:`${c.y}px auto auto ${c.x}px`,width:c.width,height:c.height,display:'flex',justifyContent:'center',alignItems:'center'}}><div data-text style={{maxWidth:'100%',boxSizing:'border-box',padding:'12px 22px',borderRadius:18,background:PAPER,fontSize:62,lineHeight:1.15,textAlign:'center'}}>{page.words.map((w,i)=>{const on=frame>=w.from&&frame<w.to;return <React.Fragment key={w.from}>{i?' ':null}<span data-word data-active={on?'true':'false'} style={{display:'inline-block',padding:'0 6px',borderRadius:6,background:on?'#FFF6C4':'transparent',textDecoration:on?'underline':'none',textDecorationThickness:3,textUnderlineOffset:6}}>{w.text}</span></React.Fragment>;})}</div></div>}
 </AbsoluteFill>;
};
export const Root=()=> <Composition id="EducaPlayRedes" component={Reel} durationInFrames={DATA.durationInFrames} fps={DATA.fps} width={1080} height={1920} defaultProps={{qa:false}}/>;
