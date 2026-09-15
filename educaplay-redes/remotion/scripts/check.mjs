import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {DATA} from '../src/data.ts';
import {LAYOUT,MEDIA} from '../src/layout.ts';
import {NOTEBOOK} from '../src/notebook-layout.ts';
const notebook=process.argv.includes('--notebook');
const output=notebook?'out/cuaderno-15s':'out/revision-v2';
const layout=notebook?NOTEBOOK:LAYOUT;
execFileSync('npx',['tsc','--noEmit'],{stdio:'inherit'});
assert.ok(fs.existsSync('public/'+DATA.master),'Falta el máster');
for(const f of ['Museo700-Regular.otf','MuseoSansRounded700.otf','Museo300-Regular.otf'])assert.ok(fs.existsSync('public/fonts/'+f),'Falta '+f);
assert.equal(DATA.captions.flatMap(p=>p.words).map(w=>w.text).join(' '),DATA.words.map(w=>w.text).join(' '));
for(let f=0;f<DATA.durationInFrames;f++){
 assert.equal(DATA.scenes.filter(s=>f>=s.from&&f<s.to).length,1,'Hueco/solape '+f);
 assert.ok(DATA.words.filter(w=>f>=w.from&&f<w.to).length<=1,'Doble resaltado '+f);
}
assert.ok(layout.card.y+layout.card.height<layout.captions.y);
for(const [src,m] of Object.entries(MEDIA)){
 assert.ok(fs.existsSync('public/'+src),'Falta '+src);
 const info=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json','public/'+src],{encoding:'utf8'})).streams[0];
 assert.equal(info.width,m.width);assert.equal(info.height,m.height);console.log(`✓ ${src}: ${m.width}×${m.height}`);
}
console.log('✓ Datos, fuentes, cobertura y geometría');
if(process.argv.includes('--skip-overlay'))process.exit(0);
fs.mkdirSync(output+'/stills',{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
const browser=await openBrowser('chrome');const snapshots=[];
try{
 const inputProps={qa:true},composition=await selectComposition({serveUrl,id:notebook?NOTEBOOK.id:DATA.id,inputProps,puppeteerInstance:browser});
 const frames=[...new Set([0,8,18,25,75,150,230,340,374,...DATA.scenes.flatMap(s=>[s.from,s.from+14,s.to-1]),...DATA.captions.map(p=>p.from+2),...(notebook?NOTEBOOK.pages.flatMap(p=>[3,7,11,17,24].map(offset=>p.from+offset)):[])])].filter(f=>f<composition.durationInFrames).sort((a,b)=>a-b);
 for(const frame of frames){let result;
 await renderStill({serveUrl,composition,inputProps,frame,puppeteerInstance:browser,output:`${output}/stills/f${frame}.png`,onBrowserLog:log=>{if(log.text.startsWith('__EDUCA_QA__'))result=JSON.parse(log.text.slice('__EDUCA_QA__'.length));}});
 assert.ok(result,'Sin QA '+frame);assert.deepEqual(result.errors,[],'QA frame '+frame);snapshots.push(result);console.log(`✓ Frame ${frame}`);
 }
}finally{await browser.close({silent:true});}
fs.writeFileSync(output+'/qa.json',JSON.stringify({snapshots},null,2));
console.log(`✓ ${snapshots.length} fotogramas comprobados.`);
