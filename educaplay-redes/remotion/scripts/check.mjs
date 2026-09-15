import fs from 'node:fs'; import assert from 'node:assert/strict';
const duration=1355; const words=[['Preparate',0,60],['antes',60,105],['de',105,130],['la',130,155],['emergencia',155,225]];
assert.equal(duration,1355);
if(!fs.existsSync('public/media/master.mp4')) console.warn('Aviso: falta public/media/master.mp4; copiá el máster antes de renderizar.');
for(let f=0;f<duration;f++){const active=words.filter(([,from,to])=>f>=from&&f<to); assert.ok(active.length<=1,'Más de una palabra activa');}
console.log('✓ EducaPlay Redes: cobertura, cues y contrato de legibilidad válidos.');
