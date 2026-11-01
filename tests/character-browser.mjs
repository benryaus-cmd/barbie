import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const walkingOnly=process.argv.includes('--walking');
const output='.test-output/character';await mkdir(output,{recursive:true});
const server=spawn('node',['--input-type=module','-e',"import {createServer} from 'vite'; const server=await createServer({server:{host:'127.0.0.1',port:8096,hmr:false}}); await server.listen();"],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:8096/tests/character-fixture.html');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:700,height:800}}),errors=[],warnings=[],shots=[],stats=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning'&&/THREE|WebGL|GL_/.test(message.text()))warnings.push(message.text());});
 await page.goto('http://127.0.0.1:8096/tests/character-fixture.html');await page.waitForFunction(()=>window.characterReady,{timeout:60000});
 async function shot(name,config,category){if(walkingOnly&&category!=='walking')return;const result=await page.evaluate(config=>window.characterQA.configure(config),{...config,label:name});assert.deepEqual(result.issues,[],`${name} finite active geometry`);assert.equal(result.glError,0,`${name} WebGL state`);assert(result.skinnedMeshes>0,`${name} has active weighted mesh`);stats.push({name,...result});const path=`${output}/${name}.png`;await page.screenshot({path});shots.push({name,path,category});}
 for(const eyeStyle of ['soft','almond','wide'])for(const mouthStyle of ['smile','soft','full'])await shot(`face-${eyeStyle}-${mouthStyle}`,{vehicle:null,view:'face',pose:'idle',hair:'pixie',look:{eyeStyle,mouthStyle},yaw:0,elevation:.015,frames:25},'faces');
 await shot('face-three-quarter',{yaw:.55,elevation:.03,look:{eyeStyle:'soft',mouthStyle:'smile'},frames:15},'faces');
 for(const pose of ['idle','wave','peace','heart','kiss','spin','dance','pet','surf','hug','arm-around','half-heart','salute','curtsy','jump'])await shot(`pose-${pose}`,{vehicle:null,pose,view:'full',hair:'blonde',look:{bottom:'pleated'},yaw:.15,elevation:.08,frames:90},'poses');
 for(const bottom of ['gown','wrap','pleated','tennis','denim-skirt','satin-mini'])for(const [angle,yaw] of [['side',Math.PI/2],['quarter',.72]])await shot(`scooter-${bottom}-${angle}`,{vehicle:'scooter',pose:'idle',view:'vehicle',hair:'updo',look:{bottom,top:'glam'},yaw,elevation:.08,frames:100},'scooter');
 for(const vehicle of ['convertible','buggy'])await shot(`vehicle-${vehicle}`,{vehicle,view:'vehicle',look:{bottom:'shorts',top:'casual'},hair:'bob',yaw:.65,elevation:.26,frames:100},'cars');
 for(const hair of ['blonde','pink','updo','bob','curls','braids','pixie','twin-buns','straight'])await shot(`hair-${hair}`,{vehicle:null,view:'hair',pose:'idle',hair,yaw:.25,elevation:.03,frames:60},'hairs');
 for(const bottom of ['gown','pleated'])for(let phase=0;phase<4;phase++)await shot(`walk-${bottom}-${phase}`,{vehicle:null,view:'full',pose:'idle',hair:'blonde',look:{bottom,top:'casual'},yaw:.25,elevation:.08,motion:{moving:true,speed:4.5,dancing:false},frames:phase?8:60},'walking');
 // Exercise live dynamics through sustained motion, seated transitions and a long input frame.
 for(const vehicle of [null,'scooter','convertible','buggy',null]){const result=await page.evaluate(vehicle=>{window.characterQA.configure({vehicle,view:'full',motion:{moving:!vehicle,speed:4.5,dancing:false},frames:180});window.characterQA.advance(1,1);return window.characterQA.inspect();},vehicle);assert.deepEqual(result.issues,[]);assert.equal(result.glError,0);}
 let transitionChecks=0;
 for(const pose of ['idle','wave','peace','heart','kiss','spin','dance','pet','surf','hug','arm-around','half-heart','salute','curtsy','jump']){for(const frames of [1,5,12]){const result=await page.evaluate(({pose,frames})=>{window.characterQA.configure({vehicle:null,pose,motion:{moving:false,speed:0,dancing:false},frames:0});window.characterQA.advance(frames);return window.characterQA.inspect();},{pose,frames});assert.deepEqual(result.issues,[],`finite transition into ${pose}`);assert.equal(result.glError,0);transitionChecks++;}}
 for(const category of ['faces','poses','scooter','cars','hairs','walking']){
  const selected=shots.filter(s=>s.category===category);if(!selected.length)continue;const images=await Promise.all(selected.map(async s=>({name:s.name,src:`data:image/png;base64,${(await readFile(s.path)).toString('base64')}`})));
  const collage=await browser.newPage({viewport:{width:1050,height:Math.ceil(selected.length/3)*400}});await collage.setContent('<body style="margin:0"><canvas id="collage"></canvas></body>');await collage.evaluate(async images=>{const canvas=document.getElementById('collage');canvas.width=1050;canvas.height=Math.ceil(images.length/3)*400;const context=canvas.getContext('2d');for(let i=0;i<images.length;i++){const img=new Image();img.src=images[i].src;await img.decode();context.drawImage(img,(i%3)*350,Math.floor(i/3)*400,350,400);}},images);await collage.locator('canvas').screenshot({path:`${output}/${category}-collage.png`});await collage.close();
 }
 const summary={screenshots:shots.length,transitionChecks,avatarDrawCalls:{min:Math.min(...stats.map(s=>s.avatarDrawCalls)),max:Math.max(...stats.map(s=>s.avatarDrawCalls))},errors,warnings:[...new Set(warnings)],stats};await writeFile(`${output}/${walkingOnly?'walking-result':'result'}.json`,JSON.stringify(summary,null,2));assert.deepEqual(errors,[],'No browser or renderer errors');console.log(JSON.stringify({...summary,stats:undefined}));
}finally{await browser?.close();server.kill();}
