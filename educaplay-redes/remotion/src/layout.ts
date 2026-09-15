export const LAYOUT={card:{x:90,y:340,width:840,height:570},captions:{x:90,y:940,width:840,height:184}};
export const MEDIA:Record<string,{width:number;height:number;kind:'image'|'video'|'gif'}>={
 'media/resources/mochila.gif':{width:435,height:480,kind:'gif'},
 'media/resources/lluvia-original.jpg':{width:1920,height:1080,kind:'image'},
 'media/resources/rain.mp4':{width:720,height:1280,kind:'video'},
};
export const fitMedia=(native:{width:number;height:number},w:number,h:number)=>{const s=Math.min(w/native.width,h/native.height);return {width:native.width*s,height:native.height*s};};
