import { useId, type ReactNode } from 'react';
import { Check, LockKeyhole, X, Shirt, Sun, Mic, Sparkles, Scissors, Footprints, Glasses, Crown, CircleOff } from 'lucide-react';

type PanelProps = { title: string; subtitle?: string; onClose: () => void; children: ReactNode; headerActions?:ReactNode; variant?: 'default' | 'stage' | 'wardrobe' };
export function Panel({ title, subtitle, onClose, children, headerActions, variant = 'default' }: PanelProps) {
  const titleId = useId();
  return (
    <div className={`dream-panel dream-panel-${variant}`}>
      {variant === 'default' ? <button type="button" className="panel-backdrop" onClick={onClose} aria-label="Close backdrop" /> : null}
      <div className="panel-sheet animate-pop" role="dialog" aria-modal={variant === 'default'} aria-labelledby={titleId} tabIndex={-1}>
        <div className="panel-handle" aria-hidden="true" />
        <header className="panel-heading"><div className="min-w-0"><h2 id={titleId}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{headerActions}<button type="button" onClick={onClose} className="panel-close" aria-label="Close panel"><X size={19} strokeWidth={2} /></button></header>
        <div className="panel-content">{children}</div>
      </div>
    </div>
  );
}

type ChoiceItem = { id: string; label: string; emoji: string; price?: number };
type ChoiceRowProps = { title: string; items: ChoiceItem[]; activeId: string; unlockedIds?: string[]; points?: number; onSelect: (id: string) => void };
export function ChoiceRow({ title, items, activeId, unlockedIds, points = 0, onSelect }: ChoiceRowProps) {
  return (
    <section className="choice-section" aria-label={title}><h3>{title}</h3><div className="choice-row">
      {items.map(item => {
        const locked = unlockedIds ? !unlockedIds.includes(item.id) : false;
        const active = item.id === activeId;
        const affordable = points >= (item.price ?? 0);
        const SwatchIcon = ({glam:Shirt,beach:Sun,popstar:Mic,casual:Shirt,blonde:Scissors,pink:Scissors,updo:Scissors,heels:Footprints,sneakers:Footprints,boots:Footprints,sunglasses:Glasses,tiara:Crown,none:CircleOff} as Record<string,typeof Shirt>)[item.id] || Sparkles;
        return <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`look-choice ${active ? 'look-choice-active' : ''} ${locked ? 'look-choice-locked' : ''}`} aria-pressed={active} aria-label={`${item.label}${locked ? `, ${item.price} points${affordable ? ', available to buy' : ', earn more points to unlock'}` : ', owned'}`}><span className={`look-swatch look-swatch-${item.id}`} aria-hidden="true"><SwatchIcon size={25} strokeWidth={1.6} /></span><span className="look-label">{item.label}</span><span className="look-status">{locked ? <><LockKeyhole size={10} /> {item.price} pts</> : active ? <><Check size={11} /> Wearing</> : 'Owned'}</span></button>;
      })}
    </div></section>
  );
}
