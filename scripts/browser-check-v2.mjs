import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Test-only input probe. No globals or fast travel are added to production source.
const probe={name:'test-input-probe',enforce:'pre',transform(code,id){if(id.endsWith('/src/components/GameView.tsx'))return code.replace('handleRef.current = handle;', 'handleRef.current = handle; window.__testGame = handle; window.__testEmit = event => callbacksRef.current.onEvent(event);').replace('event => callbacksRef.current.onEvent(event)','event => { if(event.type === "activity") window.__lastActivity = event.state; callbacksRef.current.onEvent(event); }');}};
const server=await createServer({mode:'production',plugins:[probe],server:{host:'127.0.0.1',port:0}});await server.listen();const address=server.httpServer.address(),url=`http://127.0.0.1:${address.port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:360,height:520},deviceScaleFactor:1});
await context.addInitScript(()=>{if(!sessionStorage.getItem('v2-seed')){localStorage.clear();localStorage.setItem('barbie-ultimate-dreamland:profile-v1',JSON.stringify({points:400,earned:700,outfit:'beach',hair:'blonde',accessory:'none',shoes:'heels',unlocked:['glam','beach','popstar','casual']}));sessionStorage.setItem('v2-seed','1')}});
const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS|GL_INVALID/.test(m.text()))errors.push(m.text())});
await mkdir('.test-output',{recursive:true});
const event=async(type,data={})=>page.evaluate(({type,data})=>window.__testEmit({type,...data}),{type,data});
const spot=id=>event('spot',{id});
const wait=ms=>page.waitForTimeout(ms);
try{
 await page.goto(url);
 await page.getByRole('button',{name:/step into/i}).click();await wait(1400);
 await page.screenshot({path:'.test-output/v2-world.png'});
 if(process.env.DREAMLAND_TEST_FOCUS==='utilities'){
  await page.getByRole('button',{name:'Open settings'}).click();
  for(let i=0;i<10;i++)await page.getByRole('heading',{name:'Settings',exact:true}).dispatchEvent('pointerdown',{pointerId:1});
  await page.locator('input[type=password]').fill('gg');await page.getByRole('button',{name:'Unlock',exact:true}).click();
  const button=page.getByRole('button',{name:'Download ZIP',exact:true});await button.waitFor();
  const downloading=page.waitForEvent('download');await button.click();const download=await downloading;await download.saveAs('.test-output/v2-project-export.zip');
  const {readFile}=await import('node:fs/promises'),{unzipSync}=await import('fflate');const files=Object.keys(unzipSync(await readFile('.test-output/v2-project-export.zip')));
  for(const name of ['src/game/activity-stage.ts','src/game/social.ts','src/game/residents.ts','src/game/tokens.ts'])assert(files.some(f=>f.endsWith(name)),`ZIP contains ${name}`);
  console.log('PASS hidden settings unlock and actual ZIP export includes all new gameplay modules');
 }else if(process.env.DREAMLAND_TEST_FOCUS==='photo'){
  await spot('photo');
  for(let i=0;i<6;i++){await page.waitForFunction(n=>new RegExp('SHOT\\s*'+n+'\\b').test(document.querySelector('.stage-stats')?.textContent||''),i+1);const name=(await page.locator('.photo-callout strong').innerText()).replace('!','');await page.getByRole('button',{name:'Pose '+name,exact:true}).click();await page.waitForFunction(score=>(document.querySelector('.stage-stats')?.textContent||'').includes(score+' PTS'),(i+1)*10)}
  await page.getByRole('button',{name:'Collect points'}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:dreamfeed-v1')));
  assert.equal(saved.photos.length,6,'App/Sheets wiring must save six real challenge frames');assert(saved.photos.every(p=>p.pose!=='idle'&&p.image.length>3000),'Selected actual poses reach capture metadata');
  await page.getByRole('button',{name:'Open camera and DreamFeed'}).click();await page.getByRole('button',{name:/Album ·/}).click();await page.screenshot({path:'.test-output/v2-challenge-album.png'});console.log('PASS actual App/Sheets: six selected poses and six saved scene captures');
 }else if(process.env.DREAMLAND_TEST_FOCUS==='pet'){
  await page.evaluate(()=>window.__testGame.setLook({top:'sunset',bottom:'palazzo',accessories:['tiara','sunglasses'],topColor:'#ffb3d6',bottomColor:'#53dbe4'}));
  await spot('pet');await page.getByRole('button',{name:/Pat Mochi/}).click();await wait(700);await page.screenshot({path:'.test-output/v2-pet-pat.png'});
  await page.getByRole('button',{name:/Fetch/}).click();await wait(1100);await page.screenshot({path:'.test-output/v2-pet.png'});await page.getByRole('button',{name:'Close panel'}).click();
  await page.getByRole('button',{name:'Open camera and DreamFeed'}).click();await page.getByRole('button',{name:'My pet',exact:true}).click();await wait(1200);await page.screenshot({path:'.test-output/v2-pet-selfie.png'});await page.getByRole('button',{name:'Take photo',exact:true}).click();
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS pet staging, toy play and pet scene capture');
 }else{
 const cog=await page.getByRole('button',{name:'Open settings'}).boundingBox();assert(cog.x>=0&&cog.x+cog.width<=361,'Cog stays in phone bounds');
 await page.getByRole('button',{name:'Open wardrobe'}).click();await page.getByRole('button',{name:/Sunset halter/}).click();
 await page.getByRole('tab',{name:'Bottoms',exact:true}).click();await page.getByRole('button',{name:/Palazzo trousers/}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:/Palazzo trousers/}).click();
 await page.getByRole('button',{name:'Lagoon bottom color'}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Lagoon bottom color'}).click();
 await page.getByRole('tab',{name:'Extras',exact:true}).click();for(const name of ['Crystal tiara','Cat eye shades','Heart pendant']){await page.getByRole('button',{name:new RegExp(name)}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:new RegExp(name)}).click();}
 assert.equal(await page.getByRole('button',{name:/Crystal tiara/}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('button',{name:/Cat eye shades/}).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'.test-output/v2-wardrobe.png'});assert((await page.locator('.panel-sheet').boundingBox()).height<=520*.45);
 await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Open camera and DreamFeed'}).click();await page.getByRole('button',{name:'Barbie',exact:true}).click();await page.getByRole('button',{name:'Heart',exact:true}).click();await wait(700);await page.screenshot({path:'.test-output/v2-selfie.png'});await page.getByRole('button',{name:'Take photo',exact:true}).click();
 await page.getByRole('button',{name:/Album ·/}).click();await page.getByRole('button',{name:/View photo at.*with Barbie/}).first().click();await page.getByRole('button',{name:'Share on DreamFeed',exact:true}).click();
 await page.screenshot({path:'.test-output/v2-feed.png'});const social=await page.evaluate(()=>JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:dreamfeed-v1')));assert(social.followers>0);assert(social.photos[0].image.length>3000,'Captured real scene JPEG');assert(social.photos[0].post.comments.length>0);
 await page.locator('.photo-browser .panel-close').click();await page.locator('.photo-studio .panel-close').click();
 await event('resident',{id:'brooklyn'});for(const name of ['Say hello','Talk fashion','What’s happening?'])await page.getByRole('button',{name:new RegExp(name)}).click();assert(await page.getByText('Friends',{exact:true}).count());await page.screenshot({path:'.test-output/v2-chat.png'});await page.getByRole('button',{name:'Take a selfie together'}).click();assert.equal(await page.getByRole('button',{name:'Brooklyn',exact:true}).getAttribute('aria-pressed'),'true');await page.locator('.photo-studio .panel-close').click();
 await spot('pet');await page.getByRole('button',{name:/Pat Mochi/}).click();await page.getByRole('button',{name:/Fetch/}).click();await wait(800);await page.screenshot({path:'.test-output/v2-pet.png'});assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:lifestyle-v2')))).toys.includes('ball'));await page.getByRole('button',{name:'Close panel'}).click();
 await spot('photo');assert.equal(await page.locator('.panel-backdrop').count(),0);const poseButtons=await page.locator('.challenge-pose-strip button').all();const boxes=await Promise.all(poseButtons.map(b=>b.boundingBox()));assert(boxes.every(b=>Math.abs(b.y-boxes[0].y)<2),'Photo buttons one row');await page.screenshot({path:'.test-output/v2-photo-challenge.png'});
 for(let i=0;i<6;i++){await page.waitForFunction(n=>new RegExp('SHOT\\s*'+n+'\\b').test(document.querySelector('.stage-stats')?.textContent||''),i+1);const name=(await page.locator('.photo-callout strong').innerText()).replace('!','');await page.getByRole('button',{name:'Pose '+name,exact:true}).click();await page.waitForFunction(score=>(document.querySelector('.stage-stats')?.textContent||'').includes(score+' PTS'),(i+1)*10)}await page.getByRole('button',{name:'Collect points'}).click();
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:dreamfeed-v1')))).photos.length>=7,'All six challenge photos join the prior selfie');
 await spot('runway');assert.equal(await page.locator('.panel-backdrop').count(),0);await page.screenshot({path:'.test-output/v2-runway.png'});await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Open settings'}).click();await page.getByRole('button',{name:/^Low/}).click();await page.getByRole('button',{name:'Close settings'}).click();
 await spot('surf');await wait(400);const right=await page.getByRole('button',{name:'Hold to steer right'}).boundingBox();await page.mouse.move(right.x+right.width/2,right.y+right.height/2);await page.mouse.down();await wait(700);await page.mouse.up();await wait(300);await page.screenshot({path:'.test-output/v2-surf.png'});
 assert((await page.locator('.activity-sheet').boundingBox()).y>520*.5);
 console.log('Surf stage running; waiting for full ride to finish.');await page.getByRole('button',{name:/Collect .* points/}).waitFor({timeout:60000});await page.getByRole('button',{name:/Collect .* points/}).click();
 await spot('smoothie');
 for(let round=1;round<=3;round++){
  await page.waitForFunction(r=>window.__lastActivity?.kind==='pour'&&window.__lastActivity.round===r&&window.__lastActivity.fill<.02,round).catch(()=>{});
  const button=await page.getByRole('button',{name:'Hold to pour, release at target band'}).boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();await page.waitForFunction(()=>window.__lastActivity?.fill>=window.__lastActivity?.target-.014);await page.mouse.up();if(round===1)await page.screenshot({path:'.test-output/v2-pour.png'});if(round<3)await wait(1500);
 }
 await page.getByRole('button',{name:/Collect .* points/}).waitFor();const finalPour=await page.evaluate(()=>window.__lastActivity);assert(finalPour.score>=150,'Precision pouring earns graded score');await page.getByRole('button',{name:/Collect .* points/}).click();
 await page.reload();await page.getByRole('button',{name:/step into/i}).click();await page.getByRole('button',{name:'Open wardrobe'}).click();await page.getByRole('button',{name:/Sunset halter/}).scrollIntoViewIfNeeded();assert.equal(await page.getByRole('button',{name:/Sunset halter/}).getAttribute('aria-pressed'),'true');
 assert.equal(errors.length,0,errors.slice(0,5).join('\n'));await writeFile('.test-output/v2-browser-result.json',JSON.stringify({passed:true,errors,viewports:['360x520'],followers:social.followers,pourScore:finalPour.score,checks:['short wardrobe scroll','stacked extras','scene selfie','offline publish','friendship','pet toy purchase','photo challenge six captures','runway no dim','real surf full ride','real pour3rounds','save reload']},null,2));console.log('PASS v2 integrated browser gameplay and save checks');
 }
}finally{await browser.close();await server.close();}
