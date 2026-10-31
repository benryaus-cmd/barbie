import { useEffect, useState } from 'react';
import { COLLECTOR_CARDS } from '@/game/card-collection';

type Props = { id: number; onClose: () => void; onAlbum: () => void };
export function DiscoveryCard({ id, onClose, onAlbum }: Props) {
  const card = COLLECTOR_CARDS[id];
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 180);
    return () => clearTimeout(timer);
  }, []);
  return <section className="discovery-screen" role="dialog" aria-modal="true" aria-label="New collector card">
    <p className="discovery-eyebrow">A LITTLE DREAM, DISCOVERED</p>
    <div className={`discovery-card ${revealed ? 'is-revealed' : ''}`}>
      <span className="discovery-rarity">{card.rarity} · No. {String(id + 1).padStart(2, '0')}</span>
      <img src={card.image} alt={card.title} />
      <h2>{card.title}</h2>
      <p>{card.story}</p>
    </div>
    <p className="discovery-reward">+15 style points · saved to your collection</p>
    <div className="discovery-actions"><button onClick={onAlbum}>View collection</button><button onClick={onClose}>Keep exploring →</button></div>
  </section>;
}
