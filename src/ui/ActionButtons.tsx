import { ArrowUp, ChevronRight, LogOut, Shirt, Sparkles } from 'lucide-react';
import type { NearbySpot } from '@/game/types';

type ActionButtonsProps = { near: NearbySpot; riding: boolean; onJump: () => void; onInteract: () => void; onWardrobe: () => void };
export function ActionButtons({ near, riding, onJump, onInteract, onWardrobe }: ActionButtonsProps) {
  const highlighted = Boolean(near) || riding;
  return (
    <div className="dream-actions">
      {near ? <div className="nearby-callout animate-pop"><span className="nearby-kicker">LET’S PLAY</span><strong>{near.label}</strong><p>{near.hint}</p></div> : null}
      <div className="action-row"><button type="button" onClick={onWardrobe} className="world-action wardrobe-action" aria-label="Open wardrobe"><Shirt size={21} /><span>STYLE</span></button><button type="button" onClick={onJump} className="world-action jump-action" aria-label="Jump"><ArrowUp size={23} /><span>JUMP</span></button><button type="button" onClick={onInteract} className={`world-action interact-action ${highlighted ? 'interact-ready' : ''}`} aria-label={riding ? 'Hop out of vehicle' : near ? `Play ${near.label}` : 'Interact'}>{riding ? <LogOut size={25} /> : near ? <ChevronRight size={29} /> : <Sparkles size={24} />}<span>{riding ? 'EXIT' : 'PLAY'}</span></button></div>
    </div>
  );
}
