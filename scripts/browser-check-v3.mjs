import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Read-only scene/model probes and location setup exist only in Vite's test
// transform. Scoring, clocks, animation and all controls run unchanged.
const probe = {name:'v3-gameplay-probe', enforce:'pre', transform(code,id) {
  if (id.endsWith('/src/components/GameView.tsx')) return code
    .replace('event => callbacksRef.current.onEvent(event)', 'event => {if(event.type === "activity") window.__lastActivity = event.state; callbacksRef.current.onEvent(event);}')
    .replace('handleRef.current = handle;', 'handleRef.current = handle; window.__testGame = handle; window.__testEmit = event => callbacksRef.current.onEvent(event);');
  if (id.endsWith('/src/game/sandbox.ts')) return code.replace('  function update(step: number) {', '  window.__testScene = {avatar, physics, camera:options.camera, root, pet, residents, cameraRig};\n  function update(step: number) {');
  if (id.endsWith('/src/game/activity-stage.ts')) return code.replace('   root.visible=true;surfRoot.visible', '   window.__testActivityModels={get netball(){return netball},get pour(){return pour}};\n   root.visible=true;surfRoot.visible');
}};
const server = await createServer({mode:'production', plugins:[probe], server:{host:'127.0.0.1',port:0,watch:{ignored:['**/*']}}});
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({headless:true, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context = await browser.newContext({viewport:{width:360,height:520},deviceScaleFactor:1});
await context.addInitScript(() => {
  if (!sessionStorage.getItem('dreamland-v3-seed')) {
    localStorage.clear();
    localStorage.setItem('barbie-ultimate-dreamland:profile-v1',JSON.stringify({points:1500,earned:1500,outfit:'beach',hair:'blonde',accessory:'none',shoes:'heels',unlocked:['glam','beach','popstar','casual']}));
    // A genuine supported quality setting keeps SwiftShader useful on CI.
    localStorage.setItem('barbie-ultimate-dreamland:preferences-v1',JSON.stringify({quality:'low',music:false,effects:false,sparkles:false,sensitivity:1,reducedMotion:false}));
    sessionStorage.setItem('dreamland-v3-seed','1');
  }
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [], checks = [], shots = [], details = {};
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => {if(msg.type()==='error' && /Shader Error|VALIDATE_STATUS|GL_INVALID|CONTEXT_LOST_WEBGL/.test(msg.text()))errors.push(msg.text());});
const output = '.test-output';
await mkdir(output,{recursive:true});
const wait = ms => page.waitForTimeout(ms);
const state = key => page.evaluate(key => JSON.parse(localStorage.getItem(`barbie-ultimate-dreamland:${key}`)),key);
const profile = () => state('profile-v1');
const life = () => state('lifestyle-v2');
const social = () => state('dreamfeed-v1');
const emit = (type,data={}) => page.evaluate(({type,data}) => window.__testEmit({type,...data}),{type,data});
const spot = id => emit('spot',{id});
const shot = async name => {const path=`${output}/v3-${name}.png`;await page.screenshot({path});shots.push(path);};
const click = async (name, exact=true) => {const button=page.getByRole('button',{name,exact});await button.scrollIntoViewIfNeeded();await button.click();};
const close = async () => {for(const selector of ['.photo-browser .panel-close','.photo-studio .panel-close','.panel-close','.activity-close']) {const button=page.locator(selector).last();if(await button.count())await button.click();}};
const scene = () => page.evaluate(() => {const s=window.__testScene;return {camera:s.camera.position.toArray(),quaternion:s.camera.quaternion.toArray(),player:s.physics.position.toArray(),avatar:s.avatar.group.position.toArray(),pet:s.pet.root.children[0].position.toArray(),petBody:s.pet.root.children[0].children[0].position.toArray(),yaw:s.cameraRig.getYaw()};});
const inspectSunhat = async contextName => {
  const result=await page.evaluate(()=>{
    const group=window.__testScene.avatar.group,hat=group.getObjectByName('Riviera sunhat');
    const look=JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:lifestyle-v2')).look;
    if(!hat)return {look,found:false};
    const ancestors=[];for(let node=hat;node;node=node.parent)ancestors.push({name:node.name||node.type,visible:node.visible});
    const meshes=[];hat.traverse(node=>{if(node.isMesh)meshes.push({type:node.type,visible:node.visible,vertices:node.geometry.attributes.position.count});});
    return {look,found:true,visible:hat.visible,effectiveVisible:ancestors.every(node=>node.visible),ancestors,meshes,worldPosition:hat.getWorldPosition(hat.position.clone()).toArray()};
  });
  details.sunhatProbes={...details.sunhatProbes,[contextName]:result};
  if(result.look.accessories.includes('sunhat'))assert(result.found&&result.visible&&result.effectiveVisible&&result.meshes.length>=3,'selected Riviera sunhat has actual visible geometry and visible ancestors');
  return result;
};
const focus = process.env.DREAMLAND_V3_FOCUS;
const run = (name, fn) => !focus || focus.split(',').includes(name) ? fn() : Promise.resolve();
const report = {passed:false,viewport:'360x520',quality:'low',renderer:null,checks,errors,screenshots:shots,details,limitations:['Panel entry uses test-only spot/resident events; this is not an island navigation or proximity-discovery test.','Pet location setup uses a test-only physics teleport; pet travel and sleep then use actual frame updates.','Netball/pour timing reads real session state to release real pointer/keyboard controls; no score, clock, physics or production source is modified.','SwiftShader desktop Chromium at 360x520 is not physical mobile hardware. Surf was covered by v2 and is omitted here.']};
try {
  await page.goto(url);
  await click(/step into/i,false);
  await page.waitForFunction(() => window.__testScene && window.__testGame);
  await wait(1500);
  report.renderer=await page.evaluate(() => {const canvas=document.querySelector('.game-view canvas'), gl=canvas.getContext('webgl2');const debug=gl.getExtension('WEBGL_debug_renderer_info');return debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  assert.match(report.renderer,/SwiftShader/i,'real SwiftShader context is in use');
  assert.equal((await profile()).points,1500,'seed gives 1500 spendable points');
  await shot('world');

  await run('fashion', async () => {
    await spot('salon');
    await click(/Twin braids, owned/);
    await click('Ocean teal');
    assert.equal((await profile()).hair,'braids');
    assert.equal((await life()).look.hairColor,'#388c94');
    await shot('salon');
    await page.getByRole('tab',{name:'Makeup station'}).click();
    await click(/Red carpet/);
    assert.equal((await life()).look.makeup,'bold');
    await shot('makeup');
    await close();
    await click('Open wardrobe');
    await click(/Sunset halter/);
    await page.getByRole('tab',{name:'Bottoms',exact:true}).click();
    await click(/Palazzo trousers/);
    await click('Lagoon bottom color');
    await page.getByRole('tab',{name:'Tops',exact:true}).click();
    const before=(await profile()).points;
    await click('Champagne top color, 30 points to unlock');
    assert.equal((await profile()).points,before-30,'premium colour purchase debits wallet');
    assert((await life()).ownedColors.includes('#e8c77b'));
    await click('Champagne top color');
    assert.equal((await life()).look.topColor,'#e8c77b','owned colour applies to top');
    await page.getByRole('tab',{name:'Extras',exact:true}).click();
    for(const extra of [/Riviera sunhat/,/Round sun lenses/,/Rainbow bangles/]) await click(extra);
    await page.getByRole('tab',{name:'Shoes',exact:true}).click();
    await click(/Gold sandals, owned/);
    await page.getByRole('tab',{name:'Sets',exact:true}).click();
    await page.getByRole('textbox',{name:'Name your look'}).fill('Golden Coast');
    await click('Save look');
    const saved=(await life()).savedLooks.find(x=>x.name==='Golden Coast');
    assert(saved,'named set persisted');
    assert.equal(saved.hair,'braids');assert.equal(saved.shoes,'sandals');assert.equal(saved.look.makeup,'bold');assert.equal(saved.look.hairColor,'#388c94');
    await page.getByRole('button',{name:'Wear Golden Coast',exact:true}).scrollIntoViewIfNeeded();
    await shot('saved-look');await inspectSunhat('saved-look');
    await click(/Glam Party, owned/);
    await page.getByRole('tab',{name:'Hair',exact:true}).click();
    await click(/Feathered pixie, owned/);
    await page.getByRole('tab',{name:'Sets',exact:true}).click();
    await click('Wear Golden Coast');
    assert.deepEqual((await life()).look,saved.look,'loading set restores complete mix, colour, extras and beauty');
    assert.equal((await profile()).hair,'braids');assert.equal((await profile()).shoes,'sandals');
    await close();
    await page.reload();await click(/step into/i,false);await page.waitForFunction(()=>window.__testScene);
    assert.deepEqual((await life()).look,saved.look,'complete look survives reload');
    await inspectSunhat('fashion-reload');
    await click('Open wardrobe');await page.getByRole('tab',{name:'Sets',exact:true}).click();
    await page.getByRole('button',{name:'Wear Golden Coast',exact:true}).waitFor();
    await close();
    details.savedLook=saved;details.walletAfterFashion=(await profile()).points;
    checks.push('salon hair/color + makeup','premium colour purchase/apply','three new layered extras','named complete set save/load + reload');
    console.log('PASS fashion: salon, makeup, premium colour, layered extras, complete set save/load/reload');
  });

  await run('social', async () => {
    await emit('resident',{id:'ken'});
    await click(/Say hello/);
    assert.match(await page.locator('.resident-line').innerText(),/I’m Ken/,'Ken has his own dialogue');
    for(const topic of [/Talk fashion/,/What’s happening/])await click(topic);
    assert.equal((await life()).friends.ken,24,'three new topics earn friendship');
    await shot('ken-chat');
    await click('Take a selfie together');
    assert.equal(await page.getByRole('button',{name:'Ken',exact:true}).getAttribute('aria-pressed'),'true');
    await click('Barbie');
    await click('Brooklyn');
    assert.equal(await page.getByRole('button',{name:'Brooklyn',exact:true}).getAttribute('aria-pressed'),'false','third co-star rejected');
    assert.match(await page.locator('.photo-composition').innerText(),/2\/2/);
    const shutter=await page.getByRole('button',{name:'Take photo',exact:true}).boundingBox();
    assert(shutter.x>=0&&shutter.x+shutter.width<=360&&shutter.y>=0&&shutter.y+shutter.height<=520,'photo shutter stays fully visible without scrolling at360x520');
    await click('Friends’ independent pose');await click('Friend pose: Kiss');
    await click('Heart');await wait(600);
    const groupPositions=await page.evaluate(()=>{const s=window.__testScene;return ['Ken','Barbie'].map(name=>({name,position:s.residents.root.getObjectByName(name).position.toArray(),visible:s.residents.root.getObjectByName(name).visible}));});
    assert(groupPositions.every(x=>x.visible),'both actual resident meshes are visible');
    await shot('two-costars');await inspectSunhat('two-costars');
    const original=await scene();
    const region=page.getByRole('region',{name:/Camera: drag/});
    const box=await region.boundingBox();
    await page.mouse.move(box.x+box.width*.35,box.y+box.height*.6);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.75,box.y+box.height*.8,{steps:8});await page.mouse.up();
    await wait(250);
    const orbited=await scene();
    assert(Math.hypot(...orbited.camera.map((v,i)=>v-original.camera[i]))>.3,'actual photo camera changes after drag');
    const radiusBefore=await page.evaluate(()=>{const s=window.__testScene;const focus=s.avatar.group.position.clone();focus.y+=.23;return s.camera.position.distanceTo(focus);});
    await click('Zoom in');await click('Zoom in');await wait(200);
    const radiusAfter=await page.evaluate(()=>{const s=window.__testScene;const focus=s.avatar.group.position.clone();focus.y+=.23;return s.camera.position.distanceTo(focus);});
    assert(radiusAfter<radiusBefore*.92,`zoom controls make a visible difference (${radiusBefore} -> ${radiusAfter})`);
    await shot('photo-orbit-zoom');
    // Return to the original frame before saving the group portrait.
    await click('Zoom out');await click('Zoom out');
    await page.mouse.move(box.x+box.width*.75,box.y+box.height*.5);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.35,box.y+box.height*.3,{steps:8});await page.mouse.up();
    await click('Paired pose');await click('Pair pose: Hug');await wait(450);
    await shot('paired-hug');
    await click('Take photo');
    const saved=(await social()).photos[0];
    assert.deepEqual(saved.groupIds,['ken','barbie']);assert.equal(saved.companionPose,'kiss');assert.equal(saved.pair,'hug');assert.equal(saved.pose,'hug');
    assert.match(saved.image,/^data:image\/jpeg;base64,/);assert(saved.image.length>3000,'real scene JPEG has image content');
    const imageQuality=await page.evaluate(async image=>{const img=new Image();img.src=image;await img.decode();const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;let sum=0,sq=0;for(let i=0;i<pixels.length;i+=4){const value=(pixels[i]+pixels[i+1]+pixels[i+2])/3;sum+=value;sq+=value*value;}return {width:img.width,height:img.height,variance:sq/1024-(sum/1024)**2};},saved.image);
    assert(imageQuality.width>=250&&imageQuality.height>=200&&imageQuality.variance>80,'JPEG decodes to nonblank scene');
    await writeFile(`${output}/v3-paired-capture.jpg`,Buffer.from(saved.image.split(',')[1],'base64'));shots.push(`${output}/v3-paired-capture.jpg`);
    await click(/Album ·/);await click(/View photo at.*Ken/);
    await click('Share on DreamFeed');
    assert((await social()).followers>0,'published group photo earns followers');
    assert((await social()).photos[0].post.comments.length>0,'published photo contains offline friend comments');
    await shot('dreamfeed');
    details.photo={groupPositions,imageQuality,groupIds:saved.groupIds,pair:saved.pair,companionPose:saved.companionPose,followers:(await social()).followers,radiusBefore,radiusAfter};
    await close();
    checks.push('Ken-specific chat + friendship','two co-stars and third invitation cap','independent co-star pose + paired hug','real photo drag + visible zoom','nonblank real JPEG capture + DreamFeed publish');
    console.log('PASS social: Ken, 2 co-stars, pair/independent poses, camera orbit/zoom, decoded JPEG, publish');
  });

  await run('pet', async () => {
    // Location setup only; every command and dog movement below is live.
    await page.evaluate(()=>window.__testScene.physics.teleport(6,1.4,-31));await wait(500);
    await spot('pet');
    assert.match(await page.locator('.pet-home-status').innerText(),/Resting at home/);
    await click('Follow me');
    await page.waitForFunction(()=>{const s=window.__testScene,p=s.physics.position,d=s.pet.root.children[0].position;return Math.hypot(d.x-(p.x-.82),d.z-(p.z+.18))<.3;},{},{timeout:30000});
    assert.match(await page.locator('.pet-home-status').innerText(),/Following you/);
    await shot('pet-follow');
    await close();
    const start=(await scene()).player;
    await page.keyboard.down('w');
    await page.waitForFunction(start=>{const p=window.__testScene.physics.position;return Math.hypot(p.x-start[0],p.z-start[2])>1.3;},start,{timeout:20000});
    await page.keyboard.up('w');await wait(750);
    const walking=await scene();
    assert(Math.hypot(walking.pet[0]-walking.player[0],walking.pet[2]-walking.player[2])<1.8,'dog follows actual moving player');
    await spot('pet');await click('Back to bed');
    await page.waitForFunction(()=>{const d=window.__testScene.pet.root.children[0];return d.position.distanceTo({x:4.5,y:.42,z:-34.5})<.12&&d.children[0].position.y<-.15;},{},{timeout:30000});
    await wait(2900);await shot('pet-home-sleep');
    await click('Whistle');
    await page.waitForFunction(()=>{const s=window.__testScene,p=s.physics.position,d=s.pet.root.children[0].position;return Math.hypot(d.x-(p.x-.82),d.z-(p.z+.18))<.3;},{},{timeout:30000});
    assert.match(await page.locator('.pet-home-status').innerText(),/Following you/);
    await shot('pet-whistle');
    details.pet={followingScene:walking,afterWhistle:await scene()};
    await close();
    checks.push('pet follow command + actual player travel','pet returns to bed + visibly sleeping mesh','whistle brings pet back');
    console.log('PASS pet: follow, real player travel, return to bed, sleep, whistle');
  });

  await run('court', async () => {
    const walletBefore=(await profile()).points;
    await spot('volley');
    await page.waitForFunction(()=>window.__lastActivity?.kind==='netball'&&window.__testActivityModels);
    const shotResults=[];
    for(let round=1;round<=5;round++) {
      await page.waitForFunction(round=>{const n=window.__testActivityModels.netball;return n.round===round&&n.phase==='aim';},round,{timeout:30000});
      const aim=await page.evaluate(()=>window.__testActivityModels.netball.aim);
      const key=aim>0?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);
      await page.waitForFunction(sign=>window.__testActivityModels.netball.aim*sign<=.015,Math.sign(aim),{polling:'raf'});
      await page.keyboard.up(key);
      const action=await page.getByRole('button',{name:'Hold to charge, release to shoot'}).boundingBox();
      await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();
      await page.waitForFunction(()=>window.__testActivityModels.netball.charge>=.625,null,{polling:'raf',timeout:20000});
      const release=await page.evaluate(()=>({aim:window.__testActivityModels.netball.aim,charge:window.__testActivityModels.netball.charge}));
      await page.mouse.up();
      await page.waitForFunction(()=>{const n=window.__testActivityModels.netball;return n.phase==='flight'&&n.shotTime>=1.15;},null,{timeout:20000});
      const result=await page.evaluate(()=>{const n=window.__testActivityModels.netball;return {score:n.score,scored:n.lastScored,feedback:n.feedback};});
      shotResults.push({round,...release,...result});
      if(round===1)await shot('netball-flight');
      assert(result.scored,`shot ${round} scores through actual live arc (${JSON.stringify(shotResults.at(-1))})`);
    }
    await page.getByRole('button',{name:'Collect 50 points',exact:true}).waitFor({timeout:30000});
    await shot('netball-complete');
    await click('Collect 50 points');
    assert.equal((await profile()).points-walletBefore,50,'five-shot session awards actual 50-point wallet payout');
    details.netball={shots:shotResults,payout:50};
    checks.push('actual five shot netball: aim, charge, flight, ring score','netball collect pays 50 once');
    console.log('PASS netball: 5 live aimed/charged shots, 50 actual points collected');
  });

  await run('pour', async () => {
    const walletBefore=(await profile()).points;
    await spot('smoothie');
    await page.waitForFunction(()=>window.__lastActivity?.kind==='pour');
    const rounds=[];
    for(let round=1;round<=3;round++) {
      await page.waitForFunction(round=>{const p=window.__testActivityModels.pour;return p.round===round&&p.pause===0&&p.fill===0;},round,{timeout:30000});
      const action=await page.getByRole('button',{name:'Hold to pour, release at target band'}).boundingBox();
      await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();
      if(round===1){await page.waitForFunction(()=>window.__testActivityModels.pour.fill>=.24,null,{polling:'raf'});await shot('pour-live');}
      await page.waitForFunction(()=>{const p=window.__testActivityModels.pour;return p.fill>=p.target-.012;},null,{polling:'raf',timeout:20000});
      const release=await page.evaluate(()=>{const p=window.__testActivityModels.pour;return {fill:p.fill,target:p.target};});
      await page.mouse.up();
      const result=await page.evaluate(()=>{const p=window.__testActivityModels.pour;return {score:p.score,feedback:p.feedback};});
      rounds.push({round,...release,...result});
    }
    details.pourRounds=rounds;
    const final=await page.evaluate(()=>({score:window.__testActivityModels.pour.score,finished:window.__testActivityModels.pour.finished}));
    assert(final.finished&&final.score>=255,`three precision rounds completed (${final.score})`);
    const collect=page.getByRole('button',{name:/Collect (\d+) points/});await collect.waitFor();
    const label=await collect.innerText();const reward=Number(label.match(/Collect (\d+) points/)[1]);
    assert.equal(reward,Math.min(30,Math.round(final.score/10)),'precision score converts to reduced payout with 30-point cap');
    assert(reward<=30&&reward<final.score,'raw precision score is not the wallet payout');
    await shot('pour-complete');await collect.click();
    assert.equal((await profile()).points-walletBefore,reward,'actual wallet receives only reduced drink reward');
    details.pour={rounds,score:final.score,payout:reward};
    checks.push('three actual hold/release drink pours','precision score converted to reduced payout capped at 30');
    console.log(`PASS pour: ${final.score} precision -> ${reward} actual wallet points`);
  });
  await run('bonus', async () => {
    // Explicit tier fixture: these followers are seeded, not organically earned.
    await page.evaluate(() => {
      const key='barbie-ultimate-dreamland:dreamfeed-v1';
      const existing=JSON.parse(localStorage.getItem(key)||'null')||{photos:[],rewardedSignatures:[]};
      localStorage.setItem(key,JSON.stringify({...existing,followers:500}));
    });
    await page.reload();await click(/step into/i,false);await page.waitForFunction(()=>window.__testGame&&window.__testScene);
    const before=await profile();
    const tierText=await page.locator('.hud-followers').innerText();
    assert.match(tierText,/500 FOLLOWERS/);assert.match(tierText,/×1\.50 POINTS/);
    await emit('token',{points:10,count:1});
    await page.waitForFunction(points=>JSON.parse(localStorage.getItem('barbie-ultimate-dreamland:profile-v1')).points===points,before.points+15);
    const after=await profile();
    assert.equal(after.points-before.points,15,'seeded 500-follower tier multiplies actual App wallet award');
    assert.equal(after.earned-before.earned,15,'earned total gets the same multiplier');
    await shot('seeded-follower-tier');await inspectSunhat('seeded-tier-reload');
    details.followerTier={fixture:'500 followers seeded into the existing social save; not organically earned',baseTokenReward:10,walletDelta:after.points-before.points,earnedDelta:after.earned-before.earned,multiplier:1.5,tierText};
    checks.push('seeded 500-follower tier: home ×1.50 label and actual 10→15 wallet/earned award');
    console.log('PASS seeded follower-tier fixture: 500 followers, home ×1.50, 10 base reward -> 15 actual wallet/earned points');
  });
  assert.equal(errors.length,0,errors.join('\n'));
  report.passed=true;
  console.log('PASS v3 integrated real-renderer gameplay:',checks.join('; '));
} catch(error) {
  report.failure=error.stack||String(error);
  await shot('failure').catch(()=>{});
  console.error(report.failure);
  process.exitCode=1;
} finally {
  await writeFile(`${output}/v3-browser-result${focus?'-'+focus.replace(/[^a-z-]/g,'-'):''}.json`,JSON.stringify(report,null,2));
  await browser.close();await server.close();
}
