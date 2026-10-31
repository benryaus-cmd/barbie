import { BookOpen, Gem, Settings, Sparkles, Trophy, Camera, Smile, PawPrint, Users } from 'lucide-react';
import { followerTier } from '../game/social';

type HudProps = { points: number; earned: number; tokens: number; followers: number; cardCount: number; zoneName: string; onLeaderboard: () => void; onAlbum: () => void; onSettings: () => void; onCamera:()=>void; onEmotes:()=>void; onPet:()=>void };
export function Hud({ points, earned, tokens, followers, cardCount, zoneName, onLeaderboard, onAlbum, onSettings, onCamera, onEmotes,onPet }: HudProps) {
  const tier = followerTier(followers);
  const progress = tier.next === null ? 100 : Math.max(0, Math.min(100, (followers - tier.minimum) / (tier.next - tier.minimum) * 100));
  return (
    <div className="dream-hud">
      <div className="hud-top"><div className="hud-location"><span className="hud-eyebrow">YOUR DREAMLAND</span><span className="hud-zone"><i />{zoneName}</span><span className="hud-inline-progress">{earned.toLocaleString()} earned · <Gem size={10}/>{tokens}</span></div><div className="hud-wallet" aria-label={`${points} style points to spend`}><Sparkles size={17} /><strong>{points.toLocaleString()}</strong><span>STYLE<br />POINTS</span></div></div>
      <div className="hud-bottom"><nav className="hud-tools" aria-label="Game menu"><button type="button" onClick={onAlbum} className="hud-tool hud-album" aria-label={`Open collector card album, ${cardCount} of 8 collected`}><BookOpen size={18} /><span>{cardCount}/8</span></button><button type="button" onClick={onLeaderboard} className="hud-tool" aria-label="Open leaderboard"><Trophy size={18} /></button><button type="button" onClick={onCamera} className="hud-tool" aria-label="Open camera and DreamFeed"><Camera size={18}/></button><button type="button" onClick={onEmotes} className="hud-tool" aria-label="Choose emote"><Smile size={18}/></button><button type="button" onClick={onPet} className="hud-tool" aria-label="Mochi pet controls"><PawPrint size={18}/></button><button type="button" onClick={onSettings} className="hud-tool" aria-label="Open settings"><Settings size={18} /></button></nav></div>
      <button type="button" className="hud-followers" onClick={onCamera} aria-label={`Open DreamFeed: ${followers} followers, ${tier.multiplier} times points${tier.next ? `, ${tier.next - followers} followers to next tier` : ', top tier'}`}><Users size={11}/><strong>{followers.toLocaleString()}</strong><span>followers · ×{tier.multiplier.toFixed(2)} points</span><span className="hud-followers-meter" aria-hidden="true"><i style={{width:`${progress}%`}} /></span></button>
    </div>
  );
}
