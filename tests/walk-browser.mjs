import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.test-output/'+(process.argv.includes('--baseline')?'walk-before':'walk-v6-1');await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:700,height:800}}),errors=[],shots=[],joints=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/character-fixture.html`);await page.waitForFunction(()=>window.characterReady,{timeout:60000});
 for(const [angle,yaw] of [['side',Math.PI/2],['front',0],['rear',Math.PI]]){
  await page.evaluate(yaw=>window.characterQA.configure({vehicle:null,view:'full',pose:'idle',hair:'updo',shoes:'boots',yaw,elevation:.01,look:{top:'casual',bottom:'shorts',topColor:'#302137',bottomColor:'#ed3997',accessories:[]},motion:{moving:true,speed:4.5,dancing:false},frames:90}),yaw);
  for(let i=0;i<12;i++){
   await page.evaluate(()=>window.characterQA.advance(4));
   const data=await page.evaluate(()=>window.characterQA.probe());joints.push({angle,frame:i,data});
   const path=`${out}/walk-${angle}-${String(i).padStart(2,'0')}.png`;await page.screenshot({path});shots.push({path,category:'walk'});
  }
 }
 for(const pose of ['idle','peace','kiss','confident','look-back'])for(const [angle,yaw] of [['front',.15],['side',Math.PI/2]]){
  const data=await page.evaluate(({pose,yaw})=>window.characterQA.configure({pose,yaw,look:{bottom:'denim-skirt'},motion:{moving:false,speed:0},frames:90}),{pose,yaw});assert.deepEqual(data.issues,[]);assert.equal(data.glError,0);
  const path=`${out}/pose-${pose}-${angle}.png`;await page.screenshot({path});shots.push({path,category:'poses'});
 }
 for(const category of ['walk','poses']){
  const selected=shots.filter(s=>s.category===category),images=await Promise.all(selected.map(async s=>(await readFile(s.path)).toString('base64')));
  const cols=category==='walk'?6:5,w=category==='walk'?1400:1750,h=Math.ceil(images.length/cols)*(category==='walk'?267:400);
  const collage=await browser.newPage({viewport:{width:w,height:h}});await collage.setContent('<body style="margin:0"><canvas id="c"></canvas></body>');
  await collage.evaluate(async({images,cols,w,h})=>{const c=document.getElementById('c');c.width=w;c.height=h;const ctx=c.getContext('2d');for(let i=0;i<images.length;i++){const img=new Image();img.src='data:image/png;base64,'+images[i];await img.decode();ctx.drawImage(img,i%cols*(w/cols),Math.floor(i/cols)*(h/Math.ceil(images.length/cols)),w/cols,h/Math.ceil(images.length/cols));}},{images,cols,w,h});
  await collage.locator('canvas').screenshot({path:`${out}/${category}.png`});await collage.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({screenshots:shots.length,errors,joints},null,2));console.log(JSON.stringify({screenshots:shots.length,errors}));
}finally{await browser.close();await server.close();}
