import React from 'react';
import {AbsoluteFill,Composition,Easing,interpolate,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {DATA,FRAME_COLORS} from './data';
import {fonts,Media,useFontsAndQA} from './Root';
import {NOTEBOOK} from './notebook-layout';

const INK='#0C2B24',PAPER='#F7FFFC',GREEN='#17613B';
const progress=(f:number,start=0,length=18)=>interpolate(f,[start,start+length],[0,1],{
  extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,.8,.24,1),
});

const Text:React.FC<{children:React.ReactNode;size?:number;light?:boolean}>=({children,size=76,light=false})=>
  <div data-text style={{fontFamily:light?'MuseoLight':'MuseoDisplay',fontWeight:light?300:700,fontSize:size,lineHeight:1.04,letterSpacing:-1.6}}>{children}</div>;
const Eyebrow:React.FC<{children:React.ReactNode}>=({children})=>
  <div data-text style={{fontFamily:'MuseoText',fontSize:27,lineHeight:1.25,letterSpacing:1.6,color:GREEN}}>{children}</div>;
const Arrive:React.FC<{children:React.ReactNode;delay?:number;distance?:number}>=({children,delay=0,distance=24})=>{
  const p=progress(useCurrentFrame(),delay,20);
  return <div style={{opacity:p,transform:`translateY(${distance*(1-p)}px)`}}>{children}</div>;
};

// One continuous path, drawn only during the relevant spoken idea.
const PencilLine:React.FC<{delay:number;color?:string;curve?:boolean}>=({delay,color=GREEN,curve=false})=>{
  const p=progress(useCurrentFrame(),delay,22);
  return <svg width="100%" height={curve?75:20} viewBox={curve?'0 0 390 75':'0 0 390 20'} aria-hidden>
    <path d={curve?'M5 11 C110 67 239 66 355 24 M341 14 L358 23 L350 41':'M4 12 Q155 4 380 8'} stroke={color} fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>
  </svg>;
};

function Clock(){
  const f=useCurrentFrame(),p=progress(f,4,29),number=progress(f,65,12);
  const handAngle=interpolate(progress(f,12,38),[0,1],[-32,0]);
  return <div style={{width:294,height:330,display:'grid',placeItems:'center',flexShrink:0}}>
    <svg width="294" height="294" viewBox="0 0 294 294" style={{gridArea:'1/1'}} aria-hidden>
      <circle cx="147" cy="147" r="127" fill="#FFF6C4"/>
      {FRAME_COLORS.map((c,i)=><circle key={c} cx="147" cy="147" r="133" fill="none" stroke={c} strokeWidth="7" pathLength="1" strokeDasharray={`${.235*p} 1`} transform={`rotate(${i*90-90} 147 147)`}/>)}
      {Array.from({length:12},(_,i)=><path key={i} d="M147 36V44" stroke={INK} opacity={.25*p} strokeWidth="3" transform={`rotate(${i*30} 147 147)`}/>)}
      <g opacity={1-number} transform={`rotate(${handAngle} 147 147)`}>
        <path d="M147 61V147L193 170" stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none"/>
        <circle cx="147" cy="147" r="6" fill={INK}/>
      </g>
    </svg>
    <div style={{gridArea:'1/1',display:'flex',flexDirection:'column',alignItems:'center',opacity:number,transform:`translateY(${12*(1-number)}px)`}}>
      <Text size={150}>5</Text><Text size={36} light>minutos</Text>
    </div>
  </div>;
}

function Opening(){
  return <>
    <Eyebrow>PREPARARSE A TIEMPO</Eyebrow>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flex:1}}>
      <div style={{width:400,display:'flex',flexDirection:'column',gap:26}}>
        <Arrive><Text size={76}>Tenés que</Text></Arrive>
        <Arrive delay={7}><Text size={76}>salir<br/>de casa.</Text></Arrive>
        <Arrive delay={46}><Eyebrow>EN MENOS DE</Eyebrow></Arrive>
      </div>
      <Clock/>
    </div>
    <PencilLine delay={24} color={FRAME_COLORS[0]}/>
  </>;
}
function Question(){
  return <>
    <Eyebrow>LO ESENCIAL, A MANO</Eyebrow>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:18,flex:1}}>
      <div style={{width:390,flexShrink:0}}>
        <Arrive delay={4}><Text size={80}>¿Qué<br/>llevarías?</Text></Arrive>
        <PencilLine delay={18} curve color={GREEN}/>
      </div>
      <Arrive delay={8} distance={38}><Media src="media/resources/mochila.gif" w={335} h={430}/></Arrive>
    </div>
  </>;
}
function Flood(){
  const f=useCurrentFrame();
  return <>
    <Eyebrow>PREVENCIÓN DE INUNDACIONES</Eyebrow>
    <Arrive delay={3}><Text size={59}>Una emergencia<br/>en cualquier hogar.</Text></Arrive>
    <Arrive delay={8} distance={20}>
      <div style={{padding:10,background:'white',boxShadow:'0 7px 16px rgba(12,43,36,.09)',display:'flex',justifyContent:'center'}}>
        <Media src="media/resources/lluvia-original.jpg" w={730} h={352}/>
      </div>
    </Arrive>
    <div style={{height:5,width:`${100*progress(f,36,24)}%`,background:FRAME_COLORS[2],borderRadius:3}}/>
  </>;
}
function Rain(){
  return <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:30}}>
    <div style={{width:400,display:'flex',flexDirection:'column',gap:30}}>
      <Eyebrow>CLIMATOLOGÍA<br/>Y PREVENCIÓN</Eyebrow>
      <Arrive delay={4}><Text size={73}>Lluvias<br/>muy<br/>intensas.</Text></Arrive>
      <PencilLine delay={15} color={FRAME_COLORS[3]}/>
    </div>
    <Arrive delay={7} distance={28}><Media src="media/resources/rain.mp4" w={290} h={520}/></Arrive>
  </div>;
}

function Page({index}:{index:number}){
  const f=useCurrentFrame(),p=progress(f,0,18);
  // Each new opaque page covers the previous one. No double-exposed text.
  // Content stays still while the page edge reveals it, then settles gently.
  return <AbsoluteFill style={{background:PAPER,clipPath:index?`inset(0 ${100*(1-p)}% 0 0)`:'none'}}>
    <div style={{height:'100%',padding:'54px 42px 32px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:22,
      backgroundImage:'linear-gradient(rgba(23,97,59,.025) 1px,transparent 1px)',backgroundSize:'100% 32px'}}>
      {index===0?<Opening/>:index===1?<Question/>:index===2?<Flood/>:<Rain/>}
    </div>
    {index>0&&p<1&&<div style={{position:'absolute',inset:`0 auto 0 ${NOTEBOOK.card.width*p-5}px`,width:5,background:FRAME_COLORS[index],opacity:1-p}}/>}
  </AbsoluteFill>;
}

export function NotebookReel({qa}:{qa:boolean}){
  const frame=useCurrentFrame();useFontsAndQA(qa,frame);
  const r=NOTEBOOK.card,c=NOTEBOOK.captions,p=progress(frame,0,20);
  const caption=DATA.captions.find(c=>frame>=c.from&&frame<c.to);
  return <AbsoluteFill style={{color:INK,fontFamily:'MuseoText',fontWeight:700,overflow:'hidden'}}>
    <style>{fonts}</style>
    <OffthreadVideo src={staticFile(DATA.master)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    <div style={{position:'absolute',inset:`${r.y+10}px auto auto ${r.x+8}px`,width:r.width-16,height:r.height,borderRadius:28,background:'#D6EAE0',opacity:p,transform:`translateY(${18*(1-p)}px) rotate(${.45*p}deg)`}}/>
    <div data-region="card" style={{position:'absolute',inset:`${r.y}px auto auto ${r.x}px`,width:r.width,height:r.height,borderRadius:28,overflow:'hidden',background:PAPER,boxShadow:'0 18px 35px rgba(12,43,36,.13)',opacity:p,transform:`translateY(${24*(1-p)}px)`}}>
      {NOTEBOOK.pages.map((s,i)=><Sequence key={s.from} from={s.from} durationInFrames={NOTEBOOK.frames-s.from}><Page index={i}/></Sequence>)}
      <div style={{position:'absolute',inset:'0 0 auto',height:NOTEBOOK.stripe.height,display:'flex'}}>
        {FRAME_COLORS.map((color,i)=><div key={color} style={{flex:1,background:color,transform:`scaleX(${progress(frame,2+i*3,18)})`,transformOrigin:'left'}}/>)}
      </div>
    </div>
    {caption&&<div data-region="captions" style={{position:'absolute',inset:`${c.y}px auto auto ${c.x}px`,width:c.width,height:c.height,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div data-text style={{maxWidth:'100%',boxSizing:'border-box',padding:'12px 22px',borderRadius:18,background:PAPER,fontSize:62,lineHeight:1.15,textAlign:'center'}}>
        {caption.words.map((w,i)=>{const active=frame>=w.from&&frame<w.to;return <React.Fragment key={w.from}>{i?' ':null}<span data-word data-active={active?'true':'false'} style={{display:'inline-block',padding:'0 6px',borderRadius:6,background:active?'#FFF6C4':'transparent',textDecoration:active?'underline':'none',textDecorationThickness:3,textUnderlineOffset:6}}>{w.text}</span></React.Fragment>;})}
      </div>
    </div>}
  </AbsoluteFill>;
}
export const NotebookComposition=()=> <Composition id={NOTEBOOK.id} component={NotebookReel} durationInFrames={NOTEBOOK.frames} fps={25} width={1080} height={1920} defaultProps={{qa:false}}/>;
