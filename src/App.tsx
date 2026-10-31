import './collection.css';
import assetsData from "@/config/assets";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { useSound } from '@aippy/runtime/audio';
import { updateScore } from '@aippy/runtime/leaderboard';
import { GameView, type GameViewHandle } from '@/components/GameView';
import { SettingsModal } from '@/components/SettingsModal';
import tweaksConfig from '@/config/tweaksConfig.json';
import type { GameConfig } from '@/game/create-game';
import { COLLECTOR_CARDS, loadCollectedCards, saveCollectedCards } from '@/game/card-collection';
import { loadPreferences, savePreferences } from '@/game/preferences';
import { loadProfile, saveProfile } from '@/game/profile';
import { DiscoveryCard } from '@/ui/DiscoveryCard';
import { ZONES } from '@/game/spots';
import type {
  AccessoryId,
  GameEvent,
  HairId,
  NearbySpot,
  OutfitId,
  ShoesId,
  SpotId,
  VehicleId,
  ZoneId
} from '@/game/types';
import { useSfx } from '@/hooks/useSfx';
import { ActionButtons } from '@/ui/ActionButtons';
import { CardAlbum } from '@/ui/CardAlbum';
import { Celebration } from '@/ui/Celebration';
import { Hud } from '@/ui/Hud';
import { Joystick } from '@/ui/Joystick';
import { Sheets, type PanelId } from '@/ui/Sheets';
import { StartScreen } from '@/ui/StartScreen';

const tweaks = aippyTweaks(tweaksConfig);
const BGM = assetsData.dreamland_pop_music;
const SOUND_ASSETS = { bgm: BGM };

const OUTFIT_PRICE: Record<OutfitId, number> = {
  glam: 0,
  beach: 0,
  popstar: 40,
  casual: 25
};

const OUTFIT_LABEL: Record<OutfitId, string> = {
  glam: 'Glam Party Dress',
  beach: 'Beach Day Set',
  popstar: 'Popstar Outfit',
  casual: 'Designer Casual'
};

const REWARDS: Partial<Record<SpotId, { points: number; title: string }>> = {
  pool: { points: 8, title: 'Poolside Sparkle' },
  smoothie: { points: 6, title: 'Tropical Smoothie' },
  cafe: { points: 6, title: 'Cupcake Treat' },
  petbed: { points: 5, title: 'Puppy Playtime' }
};

const App = () => {
  const backgroundColor = tweaks.backgroundColor.useState() as string;
  const pixelRatio = Number(tweaks.pixelRatio.useState());
  const walkSpeed = Number(tweaks.walkSpeed.useState());
  const sparkleFx = Boolean(tweaks.sparkleFx.useState());

  const [initialProfile] = useState(loadProfile);
  const rewardTimes = useRef<Partial<Record<SpotId, number>>>({});
  const gameRef = useRef<GameViewHandle | null>(null);
  const earnedRef = useRef(initialProfile.earned);
  const tokenRef = useRef(0);
  const collectedCardsRef = useRef<number[]>([]);
  const [preferences, setPreferences] = useState(loadPreferences);
  const sfx = useSfx(preferences.effects);
  const { play, stop } = useSound(SOUND_ASSETS);

  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [points, setPoints] = useState(initialProfile.points);
  const [earned, setEarned] = useState(initialProfile.earned);
  const [tokens, setTokens] = useState(0);
  const [collectedCards, setCollectedCards] = useState<number[]>(loadCollectedCards);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zone, setZone] = useState<ZoneId>('dreamhouse');
  const [near, setNear] = useState<NearbySpot>(null);
  const [vehicle, setVehicle] = useState<VehicleId | null>(null);
  const [panel, setPanel] = useState<PanelId>('none');
  const [notice, setNotice] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<OutfitId>(initialProfile.outfit);
  const [hair, setHair] = useState<HairId>(initialProfile.hair);
  const [accessory, setAccessory] = useState<AccessoryId>(initialProfile.accessory);
  const [shoes, setShoes] = useState<ShoesId>(initialProfile.shoes);
  const [unlocked, setUnlocked] = useState<OutfitId[]>(initialProfile.unlocked);
  const [discovery, setDiscovery] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);

  useEffect(() => {
    collectedCardsRef.current = collectedCards;
    saveCollectedCards(collectedCards);
  }, [collectedCards]);

  const overlayOpen = panel !== 'none' || albumOpen || settingsOpen || discovery !== null || !started;
  useEffect(() => {
    gameRef.current?.setMove(0, 0);
    gameRef.current?.setInputEnabled(!overlayOpen);
    gameRef.current?.setPresentation(
      panel === 'wardrobe' || panel === 'boutique' ? 'style' :
      panel === 'dj' || panel === 'dancefloor' || panel === 'runway' || panel === 'photo' ? 'dance' : 'world'
    );
    gameRef.current?.setDancing(panel === 'dj' || panel === 'dancefloor' || panel === 'runway' || panel === 'photo');
  }, [panel, albumOpen, settingsOpen, discovery, started]);
  useEffect(() => {
    gameRef.current?.setOutfit(outfit);
    gameRef.current?.setHair(hair);
    gameRef.current?.setAccessory(accessory);
    gameRef.current?.setShoes(shoes);
    saveProfile({ points, earned, outfit, hair, accessory, shoes, unlocked });
  }, [points, earned, outfit, hair, accessory, shoes, unlocked]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const config = useMemo<GameConfig>(
    () => ({ backgroundColor, pixelRatio: preferences.quality === 'low' ? .8 : preferences.quality === 'high' ? 1.75 : Math.min(pixelRatio,1.25), walkSpeed, sparkleFx: sparkleFx && preferences.sparkles && preferences.quality !== 'low', quality: preferences.quality, cameraSensitivity: preferences.sensitivity }),
    [backgroundColor, pixelRatio, walkSpeed, sparkleFx, preferences]
  );

  useEffect(() => {
    return () => {
      stop('bgm');
    };
  }, [stop]);

  useEffect(() => {
    savePreferences(preferences);
    if (started && preferences.music) void play('bgm', {loop:true, volume:.42});
    else stop('bgm');
  }, [preferences.music, started, play, stop]);
  useEffect(() => { savePreferences(preferences); }, [preferences]);

  const awardPoints = useCallback(
    (amount: number) => {
      earnedRef.current += amount;
      setEarned(earnedRef.current);
      setPoints(current => current + amount);
      updateScore(earnedRef.current);
      sfx.points();
      if (amount >= 10) gameRef.current?.celebrate();
    },
    [sfx]
  );

  const handleEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === 'zone') {
        setZone(event.zone);
        return;
      }
      if (event.type === 'near') {
        setNear(event.spot);
        return;
      }
      if (event.type === 'vehicle') {
        setVehicle(event.vehicle);
        return;
      }
      if (event.type === 'collectorCard') {
        if (collectedCardsRef.current.includes(event.id)) return;
        const next = [...collectedCardsRef.current, event.id];
        collectedCardsRef.current = next;
        setCollectedCards(next);
        setDiscovery(event.id);
        awardPoints(15);
        gameRef.current?.celebrate();
        sfx.fanfare();
        return;
      }
      if (event.type === 'token') {
        tokenRef.current += event.count;
        setTokens(tokenRef.current);
        awardPoints(event.points);
        return;
      }

      const reward = REWARDS[event.id];
      if (reward) {
        const now = Date.now();
        if (now - (rewardTimes.current[event.id] || 0) < 30000) {
          setToast('Let this spot recharge — try a new activity!');
          return;
        }
        rewardTimes.current[event.id] = now;
        awardPoints(reward.points);
        setCelebration({
          title: reward.title,
          subtitle: `+${reward.points} style points`
        });
        if (event.id === 'petbed') sfx.pet();
        return;
      }

      if (event.id === 'dj') {
        gameRef.current?.setDancing(true);
        setPanel('dj');
        return;
      }
      if (event.id === 'dancefloor') {
        gameRef.current?.setDancing(true);
        setPanel('dancefloor');
        return;
      }
      if (event.id === 'runway') {
        setPanel('runway');
        return;
      }
      if (event.id === 'pet') {
        setPanel('pet');
        return;
      }
      if (event.id === 'wardrobe') {
        setPanel('wardrobe');
        return;
      }
      if (event.id === 'mirror') {
        awardPoints(2);
        gameRef.current?.celebrate();
        setNotice('Smart Mirror: instant look preview');
        setPanel('wardrobe');
        return;
      }
      if (event.id === 'moodlight') {
        setPanel('moodlight');
        return;
      }
      if (event.id === 'kitchen') {
        setPanel('kitchen');
        return;
      }
      if (event.id === 'slide') {
        setPanel('slide');
        return;
      }
      if (event.id === 'surf') {
        setPanel('surf');
        return;
      }
      if (event.id === 'volley') {
        setPanel('volley');
        return;
      }
      if (event.id === 'photo') {
        setPanel('photo');
        return;
      }
      if (event.id === 'boutique') setPanel('boutique');
    },
    [awardPoints, sfx]
  );

  const handleStart = useCallback(() => {
    sfx.tap();
    setStarted(true);
  }, [play, sfx, preferences.music]);

  const handleMove = useCallback((x: number, y: number) => {
    gameRef.current?.setMove(x, y);
  }, []);

  const handleJump = useCallback(() => {
    gameRef.current?.jump();
    sfx.jump();
  }, [sfx]);

  const handleInteract = useCallback(() => {
    gameRef.current?.interact();
    sfx.tap();
  }, [sfx]);

  const handleMood = useCallback((color: number) => {
    gameRef.current?.setMoodLight(color);
  }, []);

  const closePanel = useCallback(() => {
    setPanel('none');
    setNotice(null);
    gameRef.current?.setDancing(false);
  }, []);

  const chooseOutfit = useCallback(
    (id: OutfitId) => {
      if (!unlocked.includes(id)) {
        const price = OUTFIT_PRICE[id];
        if (points < price) {
          setNotice(`Earn ${price - points} more style points to unlock`);
          return;
        }
        setPoints(current => current - price);
        setUnlocked(list => [...list, id]);
        setNotice(null);
        setCelebration({ title: 'New Look Unlocked', subtitle: OUTFIT_LABEL[id] });
        sfx.fanfare();
      } else {
        sfx.tap();
      }
      setOutfit(id);
      gameRef.current?.setOutfit(id);
    },
    [points, unlocked, sfx]
  );

  const syncScore = useCallback(() => {
    setSyncing(true);
    updateScore(earnedRef.current);
    sfx.tap();
    setTimeout(() => setSyncing(false), 900);
  }, [sfx]);

  return (
    <div className={`app-shell ${preferences.reducedMotion ? 'reduce-motion' : ''}`}>
      {error ? (
        <div className="absolute inset-x-4 top-4 z-50 rounded-xl bg-[#2a1030]/80 px-3 py-2 text-xs text-white">
          {error}
        </div>
      ) : null}

      <GameView
        ref={gameRef}
        config={config}
        onError={setError}
        onEvent={handleEvent}
        initialCollectedCards={collectedCards}
      />

      <div className="ui-layer">
        {started ? (
          <>
            {!overlayOpen ? <div className="flex h-full flex-col justify-between">
              <Hud
                points={points}
                earned={earned}
                tokens={tokens}
                cardCount={collectedCards.length}
                zoneName={ZONES[zone].name}
                onLeaderboard={() => {
                  setPanel('leaderboard');
                  sfx.tap();
                }}
                onAlbum={() => {
                  setAlbumOpen(true);
                  sfx.tap();
                }}
                onSettings={() => {
                  setSettingsOpen(true);
                  sfx.tap();
                }}
              />
              <div className="dream-next pointer-events-auto" role="status">
                <span className="dream-next-label">YOUR NEXT DISCOVERY</span>
                <button type="button" onClick={() => setAlbumOpen(true)}>
                  {collectedCards.length === 8 ? 'Collection complete · revisit your favourite look' : `${COLLECTOR_CARDS.find(card => !collectedCards.includes(card.id))?.location} · open your collector passport →`}
                </button>
              </div>
              <div className="dream-controls flex items-end justify-between gap-3 px-3 pb-3">
                <Joystick onChange={handleMove} />
                <ActionButtons
                  near={near}
                  riding={Boolean(vehicle)}
                  onJump={handleJump}
                  onInteract={handleInteract}
                  onWardrobe={() => {
                    setPanel('wardrobe');
                    sfx.tap();
                  }}
                />
              </div>
            </div> : null}

            <Sheets
              panel={panel}
              points={points}
              earned={earned}
              notice={notice}
              syncing={syncing}
              outfit={outfit}
              hair={hair}
              accessory={accessory}
              shoes={shoes}
              unlocked={unlocked}
              onClose={closePanel}
              onOutfit={chooseOutfit}
              onHair={id => {
                setHair(id);
                gameRef.current?.setHair(id);
                sfx.tap();
              }}
              onAccessory={id => {
                setAccessory(id);
                gameRef.current?.setAccessory(id);
                sfx.tap();
              }}
              onShoes={id => {
                setShoes(id);
                gameRef.current?.setShoes(id);
                sfx.tap();
              }}
              onAward={(score, stopDancing) => {
                awardPoints(score);
                sfx.fanfare();
                if (stopDancing) gameRef.current?.setDancing(false);
                setPanel('none');
              }}
              onMilestone={() => {
                gameRef.current?.celebrate();
                sfx.hit();
              }}
              onPetAction={() => {
                sfx.pet();
                gameRef.current?.celebrate();
              }}
              onSync={syncScore}
              onMood={handleMood}
              onBonus={awardPoints}
            />

            {toast ? <div className="dream-toast" role="status">{toast}</div> : null}
            {discovery !== null ? <DiscoveryCard id={discovery} onClose={() => setDiscovery(null)} onAlbum={() => { setDiscovery(null); setAlbumOpen(true); }} /> : null}
            {albumOpen ? (
              <CardAlbum
                collected={collectedCards}
                onClose={() => setAlbumOpen(false)}
              />
            ) : null}

            {celebration ? (
              <Celebration
                title={celebration.title}
                subtitle={celebration.subtitle}
                onDone={() => setCelebration(null)}
              />
            ) : null}
          </>
        ) : (
          <StartScreen loading={false} onStart={handleStart} />
        )}

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} preferences={preferences} onPreferences={setPreferences} />
      </div>
    </div>
  );
};

export default App;