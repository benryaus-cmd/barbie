import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const cases=process.argv.find(a=>a.startsWith('--cases='))?.slice(8).split(',');
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const out='.test-output/fit-v5-1';await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:700,height:800}}),errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|Shader|THREE/.test(m.text()))errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/character-fixture.html`);await page.waitForFunction(()=>window.characterReady);
 async function shot(name,config,category){if(only&&!only.includes(category)||cases&&!cases.includes(name))return;const result=await page.evaluate(config=>window.characterQA.configure({...config,label:config.label||'Character fit check'}),config);assert.deepEqual(result.issues,[]);assert.equal(result.glError,0);const path=`${out}/${name}.png`;await page.screenshot({path});shots.push({name,path,category});}
 for(const bottom of ['shorts','palazzo'])for(const [angle,yaw] of [['front',.18],['back',Math.PI+.18],['under',.15]])await shot(`pants-${bottom}-${angle}`,{vehicle:null,view:'full',pose:'idle',hair:'pixie',look:{bottom,top:'casual',topColor:'#302137',bottomColor:'#ec4899',accessories:[]},yaw,elevation:angle==='under'?-.30:.04,motion:{moving:false,speed:0,dancing:false},frames:100},'pants');
 for(const bottom of ['shorts','palazzo'])for(const pose of ['dance','surf'])await shot(`pants-${bottom}-${pose}`,{pose,yaw:.45,elevation:-.18,look:{bottom},frames:120},'pants');
 for(const bottom of ['shorts','palazzo'])await shot(`pants-${bottom}-scooter`,{vehicle:'scooter',view:'vehicle',pose:'idle',yaw:.65,elevation:-.04,look:{bottom},frames:120},'pants');
 for(const top of ['glam','beach','popstar','casual','sunset','denim','sport','midnight'])await shot(`necklace-${top}`,{vehicle:null,view:'hair',pose:'idle',hair:'updo',yaw:.18,elevation:-.08,look:{top,bottom:'shorts',topColor:'#302137',accessories:['necklace']},motion:{moving:false,speed:0,dancing:false},frames:90},'necklace');
 for(const bottom of ['gown','wrap','pleated','tennis','denim-skirt','satin-mini'])for(const [angle,yaw] of [['rear',Math.PI+.15],['front',.15]])for(let phase=0;phase<3;phase++)await shot(`gait-${bottom}-${angle}-${phase}`,{vehicle:null,view:'full',pose:'idle',hair:'pixie',yaw,elevation:-.03,look:{bottom,top:'casual',accessories:[]},motion:{moving:true,speed:4.5,dancing:false},frames:phase?10:60},'gait-'+angle);
 for(const category of ['pants','necklace','gait-rear','gait-front']){
  const selected=shots.filter(s=>s.category===category);if(!selected.length)continue;const data=await Promise.all(selected.map(async s=>({...s,image:(await readFile(s.path)).toString('base64')})));
  const collage=await browser.newPage({viewport:{width:1050,height:Math.ceil(data.length/3)*400}});await collage.setContent('<canvas id="c"></canvas>');await collage.evaluate(async data=>{document.body.style.margin=0;const c=document.getElementById('c');c.width=1050;c.height=Math.ceil(data.length/3)*400;const ctx=c.getContext('2d');for(let i=0;i<data.length;i++){const img=new Image();img.src='data:image/png;base64,'+data[i].image;await img.decode();ctx.drawImage(img,i%3*350,Math.floor(i/3)*400,350,400);}},data);await collage.locator('canvas').screenshot({path:`${out}/${category}.png`});await collage.close();
 }
 assert.deepEqual(errors,[]);const report={screenshots:shots.length,errors,checked:[...new Set(shots.map(s=>s.category))]};await writeFile(`${out}/${cases?'result-cases':only?'result-'+only.join('-'):'result'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await server.close();}
