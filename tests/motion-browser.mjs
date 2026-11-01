import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.test-output/motion-v6';await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:700,height:800}}),errors=[],shots=[],stats=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|Shader|THREE/.test(m.text()))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/character-fixture.html`);await page.waitForFunction(()=>window.characterReady);
 async function shot(name,config,category){const result=await page.evaluate(config=>window.characterQA.configure({...config,label:config.label||'Character motion / fit QA'}),config);assert.deepEqual(result.issues,[]);assert.equal(result.glError,0);stats.push(result);const path=`${out}/${name}.png`;await page.screenshot({path});shots.push({name,path,category});}
 for(const pose of ['idle','wave','peace','heart','kiss','salute','curtsy','dance','confident','look-back','cheer','shy','point','stretch'])await shot(`pose-${pose}`,{vehicle:null,view:'full',pose,hair:'bob',look:{top:'casual',bottom:'pleated',accessories:['necklace'],topColor:'#302137',bottomColor:'#ed3997'},motion:{moving:false,speed:0,dancing:false},yaw:.25,elevation:.04,frames:90},'poses');
 for(const top of ['casual','popstar'])await shot(`surface-${top}`,{view:'detail',pose:'idle',look:{top},yaw:1.20,elevation:.03,frames:90},'details');
 for(const mouthStyle of ['smile','full'])await shot(`lips-${mouthStyle}`,{view:'face',hair:'pixie',pose:'kiss',look:{mouthStyle},yaw:1.05,elevation:0,frames:60},'details');
 for(const pose of ['idle','dance'])await shot(`boots-${pose}`,{view:'boots',shoes:'boots',pose,look:{bottom:'shorts'},yaw:.8,elevation:.05,frames:90},'details');
 // Stop, accelerate, turn, then stop again; all are actual Avatar.update calls.
 for(let frame=0;frame<6;frame++)await shot(`walk-${frame}`,{view:'full',vehicle:null,pose:'idle',look:{bottom:frame<3?'gown':'pleated'},yaw:frame<3?Math.PI+.2:.5,motion:{moving:true,speed:4.5},frames:frame%3?7:90},'walking');
 await shot('walk-settled',{motion:{moving:false,speed:0},frames:120},'walking');
 for(const carry of ['one-hand','two-hand']){
  await page.evaluate(carry=>window.characterQA.carry(carry),carry);
  await shot(`carry-${carry}`,{view:'full',pose:'idle',look:{bottom:'shorts'},yaw:.55,elevation:.03,frames:60},'tools');
  assert(await page.evaluate(()=>window.characterQA.swing()));
  await shot(`swing-${carry}`,{yaw:1.2,frames:27},'tools');
  await page.evaluate(()=>window.characterQA.advance(90));
  assert.equal((await page.evaluate(()=>window.characterQA.inspect())).action.active,false);
 }
 await page.evaluate(()=>window.characterQA.carry('none'));
 await shot('boots-scooter',{vehicle:'scooter',view:'vehicle',yaw:1.2,elevation:.08,frames:120},'details');
 for(const category of ['poses','details','walking','tools']){
  const selected=shots.filter(s=>s.category===category),images=await Promise.all(selected.map(async s=>({src:(await readFile(s.path)).toString('base64')})));
  const collage=await browser.newPage({viewport:{width:1400,height:Math.ceil(images.length/4)*400}});await collage.setContent('<body style="margin:0"><canvas id="c"></canvas></body>');
  await collage.evaluate(async images=>{const c=document.getElementById('c');c.width=1400;c.height=Math.ceil(images.length/4)*400;const ctx=c.getContext('2d');for(let i=0;i<images.length;i++){const img=new Image();img.src='data:image/png;base64,'+images[i].src;await img.decode();ctx.drawImage(img,i%4*350,Math.floor(i/4)*400,350,400);}},images);
  await collage.locator('canvas').screenshot({path:`${out}/${category}.png`});await collage.close();
 }
 assert.deepEqual(errors,[]);const report={screenshots:shots.length,errors,avatarDrawCalls:{min:Math.min(...stats.map(s=>s.avatarDrawCalls)),max:Math.max(...stats.map(s=>s.avatarDrawCalls))},stats};await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,stats:undefined}));
}finally{await browser.close();await server.close();}
