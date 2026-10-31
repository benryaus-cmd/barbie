import * as THREE from 'three';
import { gloss, type GlossOptions } from '@/game/palette';

type Surface = 'sand' | 'plaster' | 'wood' | 'fabric' | 'leaf';
const maps = new Map<Surface, THREE.CanvasTexture>();
/** Tiny seeded repeat maps add tactile detail without downloads or extra meshes. */
export function surface(color: number, kind: Surface, options: GlossOptions = {}) {
  const material = gloss(color, options);
  if (typeof document === 'undefined') return material;
  let map = maps.get(kind);
  if (!map) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return material;
    ctx.fillStyle = '#eee9e2'; ctx.fillRect(0, 0, 128, 128);
    let seed = 4917;
    const random = () => {seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
    const count = kind === 'sand' ? 1600 : 700;
    for (let i=0;i<count;i++) {
      const x=random()*128,y=random()*128;
      ctx.fillStyle = `rgba(${random()>.5?'255,255,255':'93,77,66'},${kind==='sand'?.08:.055})`;
      ctx.fillRect(x,y,kind==='wood'? 8+random()*34 : 1,kind==='fabric'?3:1);
    }
    ctx.lineWidth=.55;
    if(kind==='sand'||kind==='wood'||kind==='leaf') {
      ctx.strokeStyle=kind==='wood'?'rgba(87,56,38,.16)':'rgba(137,108,79,.08)';
      for(let row=0;row<128;row+=kind==='sand'?16:8) {
        ctx.beginPath();for(let x=0;x<=128;x+=4){const y=row+Math.sin(x*.05+row)*2; if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      }
    }
    if(kind==='fabric') {ctx.strokeStyle='rgba(255,255,255,.22)';for(let n=0;n<128;n+=4){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,128);ctx.moveTo(0,n);ctx.lineTo(128,n);ctx.stroke();}}
    map = new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(kind==='sand'?12:kind==='plaster'?5:2,kind==='sand'?12:kind==='plaster'?5:2);
    map.anisotropy=2;maps.set(kind,map);
  }
  material.map=map;
  return material;
}

export function signTexture(text: string, foreground = '#fff6ef', background = '#bd286e', script = false) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(ctx){ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.strokeStyle='#ffd9a0';ctx.lineWidth=3;ctx.strokeRect(8,8,496,112);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=foreground;ctx.font=script?'italic 66px Georgia, serif':'600 51px Georgia, serif';ctx.fillText(text,256,66,470);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
