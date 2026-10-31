import { BookOpen, Gem, Settings, Sparkles, Trophy } from 'lucide-react';

type HudProps = { points: number; earned: number; tokens: number; cardCount: number; zoneName: string; onLeaderboard: () => void; onAlbum: () => void; onSettings: () => void };
export function Hud({ points, earned, tokens, cardCount, zoneName, onLeaderboard, onAlbum, onSettings }: HudProps) {
  return (
    <div className="dream-hud">
      <div className="hud-top"><div className="hud-location"><span className="hud-eyebrow">YOUR DREAMLAND</span><span className="hud-zone"><i />{zoneName}</span></div><div className="hud-wallet" aria-label={`${points} style points to spend`}><Sparkles size={17} /><strong>{points.toLocaleString()}</strong><span>STYLE<br />POINTS</span></div></div>
      <div className="hud-bottom"><div className="hud-progress" aria-label={`${earned} total points earned, ${tokens} gems`}><span>{earned.toLocaleString()} earned</span><span><Gem size={12} />{tokens}</span></div><nav className="hud-tools" aria-label="Game menu"><button type="button" onClick={onAlbum} className="hud-tool hud-album" aria-label={`Open collector card album, ${cardCount} of 8 collected`}><BookOpen size={18} /><span>{cardCount}/8</span></button><button type="button" onClick={onLeaderboard} className="hud-tool" aria-label="Open leaderboard"><Trophy size={18} /></button><button type="button" onClick={onSettings} className="hud-tool" aria-label="Open settings"><Settings size={18} /></button></nav></div>
    </div>
  );
}
