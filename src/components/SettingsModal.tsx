import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { Preferences } from '@/game/preferences';
import { X, SlidersHorizontal, Volume2, Info, Check } from 'lucide-react';
import './settings.css';
import type { PointerEvent as ReactPointerEvent } from 'react';

const ProjectFileViewer = lazy(() => import('@/components/ProjectFileViewer'));

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  preferences: Preferences;
  onPreferences: (next: Preferences) => void;
};

export function SettingsModal({ open, onClose, preferences, onPreferences }: SettingsModalProps) {
  const [tab, setTab] = useState<'play' | 'audio' | 'about'>('play');
  const change = (patch: Partial<Preferences>) => onPreferences({ ...preferences, ...patch });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const secretTapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!open) {
      secretTapTimesRef.current = [];
      setPasswordOpen(false);
      setPassword('');
      setPasswordError(null);
      setViewerOpen(false);
    }
  }, [open]);

  const handleSettingsTitlePress = useCallback((event: ReactPointerEvent<HTMLHeadingElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const now = performance.now();

    secretTapTimesRef.current = [
      ...secretTapTimesRef.current.filter(time => now - time <= 8000),
      now,
    ].slice(-10);

    if (secretTapTimesRef.current.length >= 10) {
      secretTapTimesRef.current = [];
      setPasswordOpen(true);
      setPassword('');
      setPasswordError(null);
    }
  }, []);

  const handleClose = useCallback(() => {
    secretTapTimesRef.current = [];
    setPasswordOpen(false);
    setPassword('');
    setPasswordError(null);
    setViewerOpen(false);
    onClose();
  }, [onClose]);

  const handleUnlock = useCallback(() => {
    if (password === 'gg') {
      setPassword('');
      setPasswordError(null);
      setPasswordOpen(false);
      setViewerOpen(true);
      return;
    }
    setPassword('');
    setPasswordError('Incorrect password');
  }, [password]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[200] flex flex-col bg-[#120a17]/97 text-white">
      {viewerOpen ? (
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center font-mono text-[11px] text-slate-400">
              Loading project files…
            </div>
          }
        >
          <ProjectFileViewer onClose={() => setViewerOpen(false)} />
        </Suspense>
      ) : passwordOpen ? (
        <div className="flex flex-1 flex-col justify-center px-6">
          <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">
              Developer access
            </p>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') handleUnlock();
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-3 w-full rounded-xl border border-white/15 bg-[#05070b] px-3 py-3 font-mono text-[14px] text-slate-100 outline-none focus:border-emerald-500/70"
            />
            {passwordError ? (
              <p className="mt-2 font-mono text-[10px] text-rose-400">{passwordError}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordOpen(false);
                  setPassword('');
                  setPasswordError(null);
                }}
                className="flex-1 rounded-xl bg-white/10 py-3 text-[10px] font-black uppercase tracking-widest text-slate-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                className="flex-1 rounded-xl bg-emerald-500 py-3 text-[10px] font-black uppercase tracking-widest text-[#05130c] active:scale-95"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="settings-home">
          <header className="settings-header"><div><p>MAKE YOURSELF AT HOME</p><h1 onPointerDown={handleSettingsTitlePress}>Settings</h1></div><button type="button" onClick={handleClose} aria-label="Close settings"><X size={20} /></button></header>
          <nav className="settings-tabs" aria-label="Settings sections">
            <button onClick={() => setTab('play')} aria-pressed={tab === 'play'}><SlidersHorizontal size={16} />Play</button>
            <button onClick={() => setTab('audio')} aria-pressed={tab === 'audio'}><Volume2 size={16} />Sound</button>
            <button onClick={() => setTab('about')} aria-pressed={tab === 'about'}><Info size={16} />About</button>
          </nav>
          <div className="settings-body">
            {tab === 'play' ? <>
              <section><h2>Graphics quality</h2><p>Changes apply immediately. Low is ideal for older phones or a cooler, longer play session.</p><div className="quality-options">
                {([['low','Low','Light & smooth'],['balanced','Balanced','Everyday sparkle'],['high','High','Extra crisp']] as const).map(([id,title,description]) => <button key={id} type="button" onClick={() => change({quality:id})} aria-pressed={preferences.quality === id}><b>{title}</b><span>{description}</span>{preferences.quality === id ? <Check size={14} /> : null}</button>)}
              </div><p className="quality-note">{preferences.quality === 'low' ? '80% resolution · shadows and sparkle particles off' : preferences.quality === 'balanced' ? 'Up to 1.25× resolution · soft shadows' : 'Up to 1.75× resolution · soft shadows'}</p></section>
              <section><Toggle label="Sparkle particles" detail="Glitter trails and bursts. Low quality overrides this." checked={preferences.sparkles} onChange={v => change({sparkles:v})} /><Toggle label="Reduce motion" detail="Calmer interface transitions and celebrations." checked={preferences.reducedMotion} onChange={v => change({reducedMotion:v})} /></section>
              <section><h2>Camera sensitivity</h2><label className="sensitivity-row"><span>Slower</span><input aria-label="Camera sensitivity" type="range" min="0.5" max="1.5" step="0.1" value={preferences.sensitivity} onChange={e => change({sensitivity:Number(e.target.value)})} /><span>Faster</span></label><p>Drag the world to look around. Keep one thumb on the movement stick and use a second finger for the camera.</p></section>
              <section><h2>On a keyboard</h2><p>WASD / arrows to move · Space to jump · E to interact. Open your wardrobe to preview your look from the front.</p></section>
            </> : tab === 'audio' ? <section><h2>A little atmosphere</h2><Toggle label="Music" detail="Dreamland’s pop soundtrack." checked={preferences.music} onChange={v => change({music:v})} /><Toggle label="Sound effects" detail="Taps, rewards and activity sounds." checked={preferences.effects} onChange={v => change({effects:v})} /><p>On mobile, sound starts after your first tap.</p></section> : <>
              <section className="about-card"><p className="about-eyebrow">THE HAM PRESENTS</p><h2>Barbie:<br/><em>Ultimate Dreamland</em></h2><p>Made by the_ham in one Aippy prompt. Remixed from Cats and Cubes’ original — they built the dreamhouse, then apparently clocked off before the housewarming.</p><p>I brought the wardrobe, taught the doll where her knees are, and gave the dance floor enough room to actually dance. Same neighbourhood. Slightly less “that’ll do”.</p><p className="about-credit">Original concept / base: Cats and Cubes.<br/>Remix, direction & excessive pink ambition: the_ham.</p></section>
              <section><h2>A world to make your own</h2><p>Explore the Dreamhouse, Glam Beach and Fashion Avenue. Earn style points, try a new look and find all eight collector cards.</p><p>Character art, animation and scenery upgrades by the remix. Collector portraits and music carried over from the original project.</p></section>
            </>}
          </div>
          <footer className="settings-footer"><span>Saved on this device</span><button type="button" onClick={handleClose}>Back to Dreamland →</button></footer>
        </div>
      )}
    </div>
  );
}

export default SettingsModal;
function Toggle({ label, detail, checked, onChange }: {label:string;detail:string;checked:boolean;onChange:(value:boolean)=>void}) { return <button type="button" role="switch" aria-checked={checked} className="settings-toggle" onClick={() => onChange(!checked)}><span><b>{label}</b><small>{detail}</small></span><i>{checked ? <Check size={14}/> : null}</i></button>; }
