import './collection.css';
import assetsData from '@/config/assets';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {aippyTweaks} from '@aippy/runtime/tweaks';
import {useSound} from '@aippy/runtime/audio';
import {updateScore} from '@aippy/runtime/leaderboard';
import {GameView,type GameViewHandle} from '@/components/GameView';
import {SettingsModal} from '@/components/SettingsModal';
import tweaksConfig from '@/config/tweaksConfig.json';
import type {GameConfig} from '@/game/create-game';
import {COLLECTOR_CARDS,loadCollectedCards,saveCollectedCards} from '@/game/card-collection';
import {loadPreferences,savePreferences} from '@/game/preferences';
import {loadProfile,saveProfile} from '@/game/profile';
import {loadLifestyle,saveLifestyle} from '@/game/lifestyle-save';
import {TOPS,BOTTOMS,EXTRAS,presetLook,COLORS} from '@/game/fashion';
import {RESIDENTS} from '@/game/resident-data';
import {loadSocial,addPhoto,saveSocial,followerTier} from '@/game/social';
import type {ActivityState,PetAction,PoseId} from '@/game/lifestyle-types';
import {ZONES} from '@/game/spots';
import type {AccessoryId,GameEvent,HairId,NearbySpot,OutfitId,ShoesId,SpotId,VehicleId,ZoneId} from '@/game/types';
import {useSfx} from '@/hooks/useSfx';
import {ActionButtons} from '@/ui/ActionButtons';
import {CardAlbum} from '@/ui/CardAlbum';
import {Celebration} from '@/ui/Celebration';
import {DiscoveryCard} from '@/ui/DiscoveryCard';
import {Hud} from '@/ui/Hud';
import {Joystick} from '@/ui/Joystick';
import {Sheets,type PanelId} from '@/ui/Sheets';
import {StartScreen} from '@/ui/StartScreen';
import {ActivityPanel} from '@/ui/ActivityPanel';
import {BeautyStudio} from '@/ui/BeautyStudio';
import {activityReward} from '@/game/activity-model';
import {CameraControls} from '@/ui/CameraControls';
import {PhotoStudio} from '@/ui/PhotoStudio';
import {EmotePanel,PetCompanionPanel,ResidentChat} from '@/ui/LifestylePanels';

const tweaks=aippyTweaks(tweaksConfig);
const SOUND_ASSETS={bgm:assetsData.dreamland_pop_music};
const OUTFIT_PRICE:Record<OutfitId,number>={glam:0,beach:0,popstar:40,casual:25};
const REWARDS:Partial<Record<SpotId,{points:number;title:string}>>={pool:{points:8,title:'Poolside sparkle'},cafe:{points:6,title:'Cupcake break'}};
const App=()=>{
 const backgroundColor=tweaks.backgroundColor.useState() as string;
 const pixelRatio=Number(tweaks.pixelRatio.useState()),walkSpeed=Number(tweaks.walkSpeed.useState()),sparkleFx=Boolean(tweaks.sparkleFx.useState());
 const [initialProfile]=useState(loadProfile);
 const [lifestyle,setLifestyle]=useState(()=>loadLifestyle(initialProfile));
 const lifestyleRef=useRef(lifestyle); lifestyleRef.current=lifestyle;
 const gameRef=useRef<GameViewHandle|null>(null);
 const [preferences,setPreferences]=useState(loadPreferences);
 const sfx=useSfx(preferences.effects),{play,stop}=useSound(SOUND_ASSETS);
 const [error,setError]=useState<string|null>(null),[started,setStarted]=useState(false);
 const [points,setPoints]=useState(initialProfile.points),[earned,setEarned]=useState(initialProfile.earned);
 const walletRef=useRef(points),earnedRef=useRef(earned);
 const [tokens,setTokens]=useState(0),tokenRef=useRef(0);
 const [collectedCards,setCollectedCards]=useState<number[]>(loadCollectedCards),collectedRef=useRef(collectedCards);
 const [albumOpen,setAlbumOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
 const [zone,setZone]=useState<ZoneId>('dreamhouse'),[near,setNear]=useState<NearbySpot>(null),[vehicle,setVehicle]=useState<VehicleId|null>(null);
 const [panel,setPanel]=useState<PanelId>('none'),[notice,setNotice]=useState<string|null>(null);
 const [outfit,setOutfit]=useState<OutfitId>(initialProfile.outfit),[hair,setHair]=useState<HairId>(initialProfile.hair),[accessory,setAccessory]=useState<AccessoryId>(initialProfile.accessory),[shoes,setShoes]=useState<ShoesId>(initialProfile.shoes),[unlocked,setUnlocked]=useState<OutfitId[]>(initialProfile.unlocked);
 const [discovery,setDiscovery]=useState<number|null>(null),[toast,setToast]=useState<string|null>(null),[syncing,setSyncing]=useState(false);
 const [celebration,setCelebration]=useState<{title:string;subtitle:string}|null>(null);
 const [activity,setActivity]=useState<ActivityState|null>(null),[residentId,setResidentId]=useState<string|null>(null),[photoCompanion,setPhotoCompanion]=useState<string|null>(null);
 const [activityRound,setActivityRound]=useState(0);
 const [petFollowing,setPetFollowing]=useState(false);
 const [followers,setFollowers]=useState(()=>loadSocial().followers);
 const followersRef=useRef(followers);
 const rewardTimes=useRef<Partial<Record<SpotId,number>>>({}),lastPetStroke=useRef(0),poseRef=useRef<PoseId>('idle');
 const overlayOpen=panel!=='none'||albumOpen||settingsOpen||discovery!==null||!started;
 const commitLifestyle=(next:typeof lifestyle)=>{lifestyleRef.current=next;setLifestyle(next);if(!saveLifestyle(next))setToast('Device storage is full. This session is still playable.');};
 const spend=(amount:number)=>{if(!Number.isFinite(amount)||amount<0||walletRef.current<amount)return false;walletRef.current-=amount;setPoints(walletRef.current);return true;};
 const awardPoints=useCallback((amount:number)=>{if(!Number.isFinite(amount)||amount<=0)return;const safe=Math.round(amount*followerTier(followersRef.current).multiplier);earnedRef.current+=safe;walletRef.current+=safe;setEarned(earnedRef.current);setPoints(walletRef.current);updateScore(earnedRef.current);sfx.points();},[sfx]);
 const closePanel=useCallback(()=>{gameRef.current?.setActivity(null);gameRef.current?.setPouring(false);gameRef.current?.setActivityInput(0);gameRef.current?.setPose('idle');gameRef.current?.setPhotoCompanion(null);gameRef.current?.setPetAction('idle');setPanel('none');setNotice(null);},[]);
 const setPose=useCallback((pose:PoseId)=>{poseRef.current=pose;gameRef.current?.setPose(pose);},[]);
 const openCamera=(companion:string|null=null)=>{setPhotoCompanion(companion);setPanel('camera');};

 useEffect(()=>{collectedRef.current=collectedCards;saveCollectedCards(collectedCards);},[collectedCards]);
 useEffect(()=>{
  const game=gameRef.current;if(!game)return;
  game.setMove(0,0);game.setInputEnabled(!overlayOpen);
  game.setPresentation(['wardrobe','boutique','salon','makeup'].includes(panel)?'style':panel==='camera'||panel==='photo'||panel==='resident'?'photo':panel==='pet'?'pet':['dj','dancefloor','runway','emotes'].includes(panel)?'dance':'world');
  game.setActivity(panel==='surf'?'surf':panel==='pour'?'pour':panel==='netball'?'netball':panel==='volley'?'volley':null);
  game.setDancing(panel==='dj'||panel==='dancefloor');
  if(panel==='resident')game.setPhotoCompanion(residentId);else if(panel!=='camera')game.setPhotoCompanion(null);
  if(!['photo','runway','camera','emotes','surf','pet'].includes(panel))game.setPose('idle');
  if(panel!=='pet')game.setPetAction('idle');
 },[panel,albumOpen,settingsOpen,discovery,started,residentId]);
 useEffect(()=>{gameRef.current?.setOutfit(outfit);gameRef.current?.setHair(hair);gameRef.current?.setShoes(shoes);gameRef.current?.setLook(lifestyle.look);},[outfit,hair,shoes,lifestyle.look]);
 useEffect(()=>{saveProfile({points,earned,outfit,hair,accessory,shoes,unlocked});},[points,earned,outfit,hair,accessory,shoes,unlocked]);
 useEffect(()=>{saveLifestyle(lifestyle);},[lifestyle]);
 useEffect(()=>{savePreferences(preferences);},[preferences]);
 useEffect(()=>{if(started&&preferences.music)void play('bgm',{loop:true,volume:.42});else stop('bgm');return()=>stop('bgm');},[preferences.music,started,play,stop]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),2800);return()=>clearTimeout(timer);},[toast]);
 const config=useMemo<GameConfig>(()=>({backgroundColor,pixelRatio:preferences.quality==='low'?.8:preferences.quality==='high'?1.75:Math.min(pixelRatio,1.25),walkSpeed,sparkleFx:sparkleFx&&preferences.sparkles&&preferences.quality!=='low',quality:preferences.quality,cameraSensitivity:preferences.sensitivity}),[backgroundColor,pixelRatio,walkSpeed,sparkleFx,preferences]);
 const handleEvent=useCallback((event:GameEvent)=>{
  if(event.type==='zone'){setZone(event.zone);return;}
  if(event.type==='near'){setNear(event.spot);return;}
  if(event.type==='vehicle'){setVehicle(event.vehicle);return;}
  if(event.type==='activity'){setActivity(event.state);return;}
  if(event.type==='resident'){setResidentId(event.id);setPanel('resident');return;}
  if(event.type==='collectorCard'){if(collectedRef.current.includes(event.id))return;const next=[...collectedRef.current,event.id];collectedRef.current=next;setCollectedCards(next);setDiscovery(event.id);awardPoints(15);sfx.fanfare();return;}
  if(event.type==='token'){tokenRef.current+=event.count;setTokens(tokenRef.current);awardPoints(event.points);return;}
  if(event.id==='salon'||event.id==='makeup'){setPanel(event.id);return;}
  if(event.id==='smoothie'){setActivity(null);setPanel('pour');return;}
  if(event.id==='pet'||event.id==='petbed'){setPanel('pet');return;}
  if(event.id==='mirror'){setPanel('wardrobe');return;}
  const reward=REWARDS[event.id];if(reward){const now=Date.now();if(now-(rewardTimes.current[event.id]||0)<30000){setToast('Try another corner of Dreamland while this spot recharges.');return;}rewardTimes.current[event.id]=now;awardPoints(reward.points);setCelebration({title:reward.title,subtitle:`+${reward.points} style points`});return;}
  const panels:Partial<Record<SpotId,PanelId>>={dj:'dj',dancefloor:'dancefloor',runway:'runway',wardrobe:'wardrobe',moodlight:'moodlight',kitchen:'kitchen',slide:'slide',surf:'surf',volley:'volley',netball:'netball',photo:'photo',boutique:'boutique'};
  const target=panels[event.id];if(target){if(target==='surf'||target==='netball'||target==='volley')setActivity(null);setPanel(target);}
 },[awardPoints,sfx]);
 const chooseOutfit=(id:OutfitId)=>{if(!unlocked.includes(id)){if(!spend(OUTFIT_PRICE[id])){setNotice('Earn a few more style points for this look.');return;}setUnlocked([...unlocked,id]);}const current=lifestyleRef.current;const look=presetLook(id,current.look);commitLifestyle({...current,look,ownedFashion:[...new Set([...current.ownedFashion,'top:'+look.top,'bottom:'+look.bottom])]});setOutfit(id);sfx.tap();};
 const chooseFashion=(slot:'top'|'bottom'|'accessory',id:string)=>{
  const catalog=slot==='top'?TOPS:slot==='bottom'?BOTTOMS:EXTRAS;const item=catalog.find(item=>item.id===id);if(!item)return;
  const current=lifestyleRef.current,key=`${slot}:${id}`,owned=current.ownedFashion.includes(key);
  if(!owned){if(followers<(item.followers||0)){setNotice(`Grow your DreamFeed to ${item.followers} followers for this special.`);return;}if(!spend(item.price)){setNotice(`Earn ${item.price-walletRef.current} more style points.`);return;}}
  const look={...current.look};
  if(slot==='accessory'){const selected=look.accessories.includes(id as any);const family=['sunglasses','round-shades','star-shades'].includes(id)?['sunglasses','round-shades','star-shades']:['sunhat','beret'].includes(id)?['sunhat','beret']:[];look.accessories=selected?look.accessories.filter(x=>x!==id):[...look.accessories.filter(x=>!family.includes(x)),id as any];}
  else if(slot==='top')look.top=id as any;else look.bottom=id as any;
  commitLifestyle({...current,look,ownedFashion:owned?current.ownedFashion:[...current.ownedFashion,key]});setNotice(owned?null:`${item.label} is yours.`);sfx.tap();
 };
 const changeColor=(slot:'top'|'bottom',color:string)=>{if(!/^#[0-9a-f]{6}$/i.test(color))return;const current=lifestyleRef.current;if(!current.ownedColors.includes(color)){setNotice('Unlock this colour before wearing it.');return;}commitLifestyle({...current,look:{...current.look,[slot==='top'?'topColor':'bottomColor']:color}});};
 const saveLook=(name:string)=>{const current=lifestyleRef.current;if(current.savedLooks.length>=8){setNotice('Your eight sets are full. Delete one to make room.');return;}const saved={id:Date.now().toString(36),name:name.trim().slice(0,28)||`Look ${current.savedLooks.length+1}`,look:{...current.look,accessories:[...current.look.accessories]},hair,shoes};commitLifestyle({...current,savedLooks:[...current.savedLooks,saved]});setNotice('Saved to your personal sets.');};
 const loadLook=(id:string)=>{const current=lifestyleRef.current,saved=current.savedLooks.find(x=>x.id===id);if(!saved)return;setHair(saved.hair);setShoes(saved.shoes);commitLifestyle({...current,look:{...saved.look,accessories:[...saved.look.accessories]}});sfx.tap();};
 const buyColor=(color:string)=>{const current=lifestyleRef.current,item=COLORS.find(x=>x.value===color);if(!item||current.ownedColors.includes(color))return;const price=('price' in item?Number(item.price):0)||0;if(!spend(price)){setNotice(`Earn ${price-walletRef.current} more points for this colour.`);return;}commitLifestyle({...current,ownedColors:[...current.ownedColors,color]});setNotice(`${item.label} unlocked for all your clothes.`);};
 const petAction=(action:PetAction)=>{
  if(['follow','bed','whistle'].includes(action)){setPetFollowing(action!=='bed');gameRef.current?.setPetAction(action);setToast(action==='bed'?'Mochi is heading back to bed.':action==='whistle'?'Here comes Mochi!':'Mochi is coming with you.');return;}
  if(action==='idle'){gameRef.current?.setPetAction(action);return;}
  const current=lifestyleRef.current;let toys=current.toys;
  if(['ball','frisbee','treat'].includes(action)&&!toys.includes(action)){const price={ball:12,frisbee:25,treat:8}[action as 'ball'|'frisbee'|'treat'];if(!spend(price)){setToast('A few more style points will get Mochi that toy.');return;}toys=[...toys,action];}
  gameRef.current?.setPetAction(action);
  const now=Date.now();if(now-lastPetStroke.current<700){if(toys!==current.toys)commitLifestyle({...current,toys});return;}lastPetStroke.current=now;
  const next={...current,toys,petBond:Math.min(100,current.petBond+2)};
  if(now-(current.lastPetReward||0)>30000){next.lastPetReward=now;awardPoints(5);}
  commitLifestyle(next);gameRef.current?.setPose('pet');sfx.pet();
 };
 const talk=(topic:'meet'|'style'|'plans')=>{if(!residentId)return;const current=lifestyleRef.current;const topics=current.topics[residentId]||[];if(!topics.includes(topic)){commitLifestyle({...current,friends:{...current.friends,[residentId]:Math.min(100,(current.friends[residentId]||0)+8)},topics:{...current.topics,[residentId]:[...topics,topic]}});awardPoints(2);}setPose(topic==='meet'?'wave':topic==='style'?'peace':'heart');};
 const captureChallenge=()=>{const image=gameRef.current?.capturePhoto();if(!image)return;const next=addPhoto(loadSocial(),{image,pose:poseRef.current,companionId:null,companionName:'Solo',zone:ZONES[zone].name,look:lifestyleRef.current.look});const saved=saveSocial(next);setToast(saved.persisted?'Photo saved to your DreamFeed camera roll.':'This device could not save the photo. Try clearing some space.');};
 const handleFollowers=(value:number)=>{
  const gained=value-followersRef.current;followersRef.current=value;setFollowers(value);
  if(gained<=0)return;
  const posted=loadSocial().photos.filter(p=>p.post).sort((a,b)=>b.post.publishedAt-a.post.publishedAt)[0];
  const ids=posted?.groupIds||[],current=lifestyleRef.current;
  const friends={...current.friends};for(const id of ids)if(RESIDENTS.some(r=>r.id===id))friends[id]=Math.min(100,(friends[id]||0)+6);
  if(ids.length)commitLifestyle({...current,friends,petBond:ids.includes('pet')?Math.min(100,current.petBond+4):current.petBond});
 };
 const resident=RESIDENTS.find(r=>r.id===residentId);
 return <div className={`app-shell ${preferences.reducedMotion?'reduce-motion':''}`}>
  {error?<div className="absolute inset-x-4 top-4 z-50 rounded-xl bg-[#2a1030]/80 px-3 py-2 text-xs text-white">{error}</div>:null}
  <GameView ref={gameRef} config={config} onError={setError} onEvent={handleEvent} initialCollectedCards={collectedCards}/>
  <div className="ui-layer">{started?<>
   {!overlayOpen?<div className="flex h-full flex-col justify-between">
    <Hud followers={followers} points={points} earned={earned} tokens={tokens} cardCount={collectedCards.length} zoneName={ZONES[zone].name} onLeaderboard={()=>{setPanel('leaderboard');sfx.tap();}} onAlbum={()=>setAlbumOpen(true)} onSettings={()=>setSettingsOpen(true)} onCamera={()=>openCamera()} onEmotes={()=>setPanel('emotes')} onPet={()=>setPanel('pet')}/>

    <div className="dream-controls flex items-end justify-between gap-3 px-3 pb-3"><Joystick onChange={(x,y)=>gameRef.current?.setMove(x,y)}/><ActionButtons near={near} riding={Boolean(vehicle)} onJump={()=>{gameRef.current?.jump();sfx.jump();}} onInteract={()=>{gameRef.current?.interact();sfx.tap();}} onWardrobe={()=>{setPanel('wardrobe');sfx.tap();}}/></div>
   </div>:null}
   {['wardrobe','boutique','salon','makeup'].includes(panel)?<CameraControls onOrbit={(dx,dy)=>gameRef.current?.rotateCamera(dx,dy)} onZoom={delta=>gameRef.current?.zoomCamera(delta)}/>:null}
   <Sheets onLook={look=>commitLifestyle({...lifestyleRef.current,look})} savedLooks={lifestyle.savedLooks} onSaveLook={saveLook} onLoadLook={loadLook} onDeleteLook={id=>commitLifestyle({...lifestyleRef.current,savedLooks:lifestyleRef.current.savedLooks.filter(x=>x.id!==id)})} ownedColors={lifestyle.ownedColors} onBuyColor={buyColor} panel={panel} points={points} earned={earned} notice={notice} syncing={syncing} outfit={outfit} hair={hair} accessory={accessory} shoes={shoes} unlocked={unlocked} look={lifestyle.look} ownedFashion={lifestyle.ownedFashion} followers={followers} onFashion={chooseFashion} onColor={changeColor} onPose={setPose} onCapture={captureChallenge} onClose={closePanel} onOutfit={chooseOutfit} onHair={id=>{setHair(id);sfx.tap();}} onAccessory={id=>setAccessory(id)} onShoes={id=>{setShoes(id);sfx.tap();}} onAward={score=>{awardPoints(score);sfx.fanfare();closePanel();}} onMilestone={()=>{if(!['photo','runway'].includes(panel))gameRef.current?.celebrate();sfx.hit();}} onPetAction={()=>petAction('pat')} onSync={()=>{setSyncing(true);updateScore(earnedRef.current);setTimeout(()=>setSyncing(false),900);}} onMood={color=>gameRef.current?.setMoodLight(color)} onBonus={awardPoints}/>
   {panel==='surf'||panel==='pour'||panel==='netball'||panel==='volley'?<ActivityPanel key={`${panel}:${activityRound}`} onReplay={panel==='volley'?score=>{awardPoints(activityReward('volley',score));gameRef.current?.setActivity(null);gameRef.current?.setActivity('volley');setActivityRound(n=>n+1);sfx.fanfare();}:undefined} rewardMultiplier={followerTier(followers).multiplier} kind={panel} state={activity} onInput={v=>gameRef.current?.setActivityInput(v)} onPouring={v=>gameRef.current?.setPouring(v)} onClose={closePanel} onCollect={score=>{awardPoints(activityReward(panel,score));closePanel();sfx.fanfare();}}/>:null}
   {panel==='camera'?<PhotoStudio onPan={(dx,dy)=>gameRef.current?.panCamera(dx,dy)} onResetFrame={()=>gameRef.current?.resetPhotoFraming()} onOrbit={(dx,dy)=>gameRef.current?.rotateCamera(dx,dy)} onZoom={delta=>gameRef.current?.zoomCamera(delta)} onGroup={(ids,pose,pair)=>gameRef.current?.setPhotoGroup(ids,pose,pair)} initialCompanion={photoCompanion} onClose={closePanel} capture={fullFrame=>gameRef.current?.capturePhoto(fullFrame)||null} onPose={setPose} onCompanion={id=>gameRef.current?.setPhotoCompanion(id)} followers={followers} onFollowers={handleFollowers} look={lifestyle.look} zone={ZONES[zone].name}/>:null}
   {panel==='salon'||panel==='makeup'?<BeautyStudio mode={panel==='salon'?'hair':'makeup'} hair={hair} look={lifestyle.look} points={points} onHair={setHair} onLook={look=>commitLifestyle({...lifestyleRef.current,look})} onClose={closePanel}/>:null}
   {panel==='emotes'?<EmotePanel onClose={closePanel} onPose={setPose}/>:null}
   {panel==='resident'&&resident?<ResidentChat key={resident.id} resident={resident} bond={lifestyle.friends[resident.id]||0} topics={lifestyle.topics[resident.id]||[]} onTopic={talk} onPhoto={()=>openCamera(resident.id)} onClose={closePanel}/>:null}
   {panel==='pet'?<PetCompanionPanel following={petFollowing} onMode={petAction} bond={lifestyle.petBond} toys={lifestyle.toys} points={points} onAction={petAction} onPhoto={()=>openCamera('pet')} onClose={closePanel}/>:null}
   {toast?<div className="dream-toast" role="status">{toast}</div>:null}
   {discovery!==null?<DiscoveryCard id={discovery} onClose={()=>setDiscovery(null)} onAlbum={()=>{setDiscovery(null);setAlbumOpen(true);}}/>:null}
   {albumOpen?<CardAlbum collected={collectedCards} onClose={()=>setAlbumOpen(false)}/>:null}
   {celebration?<Celebration title={celebration.title} subtitle={celebration.subtitle} onDone={()=>setCelebration(null)}/>:null}
  </>:<StartScreen loading={false} onStart={()=>{sfx.tap();setStarted(true);}}/>}
  <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} preferences={preferences} onPreferences={setPreferences}/>
  </div>
 </div>;
};
export default App;
