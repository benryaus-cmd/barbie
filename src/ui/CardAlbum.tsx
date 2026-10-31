import { useState } from 'react';
import { COLLECTOR_CARDS } from '@/game/card-collection';

type CardAlbumProps = {
  collected: number[];
  onClose: () => void;
};

export function CardAlbum({ collected, onClose }: CardAlbumProps) {
  const [openCard, setOpenCard] = useState<number | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const card = openCard === null ? null : COLLECTOR_CARDS[openCard];

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-[#160d22]/95 px-4 pb-4 pt-[max(12px,env(safe-area-inset-top))] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb4d9]">
            Dreamland collection
          </p>
          <h2 className="text-xl font-black">The Dreamland Edit</h2>
          <p className="text-xs font-semibold text-white/75">
            {collected.length} / 8 collected · find every fashion story
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/70 bg-white/15 text-xl active:scale-95"
          aria-label="Close collector card album"
        >
          ✕
        </button>
      </header>

      <div className="album-progress" aria-label={`${collected.length} of 8 cards collected`}><i style={{width: `${collected.length / 8 * 100}%`}} /></div>
      {hint !== null ? <div className="album-clue" role="status"><b>{COLLECTOR_CARDS[hint].location}</b><p>{COLLECTOR_CARDS[hint].clue}</p></div> : <p className="mt-2 text-xs text-white/60">Tap an empty card for a discovery clue.</p>}
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pb-3">
        {COLLECTOR_CARDS.map(item => {
          const found = collected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => found ? setOpenCard(item.id) : setHint(item.id)}
              className={`flex min-h-[150px] flex-col overflow-hidden rounded-2xl border-2 p-2 text-left shadow-lg ${
                found
                  ? 'border-[#ffd976] bg-gradient-to-br from-[#fff6fc] to-[#dff7ff] active:scale-[0.98]'
                  : 'border-white/20 bg-white/10'
              }`}
              aria-label={found ? `View card ${item.id + 1}: ${item.title}` : `Card ${item.id + 1}, not found`}
            >
              <div className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl ${found ? 'bg-[#fff7fc]' : 'bg-[#372140]'}`} >
                {found ? (
                  <img
                    src={item.image}
                    alt={`${item.title} Barbie collector card`}
                    className="h-full max-h-40 w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/55">
                    <span className="text-4xl">🎀</span>
                    <span className="text-2xl font-black">{item.id + 1}</span>
                  </div>
                )}
              </div>
              <span className={`mt-2 truncate text-xs font-black ${found ? 'text-[#8b245d]' : 'text-white/70'}`}>
                {found ? item.title : 'Undiscovered'}
              </span>
              <span className={`text-[10px] ${found ? 'text-[#a4547d]' : 'text-white/45'}`}>
                {found ? `${item.rarity} · ${item.location}` : `${item.location} · tap for clue`}
              </span>
            </button>
          );
        })}
      </div>

      {card ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#10091a] p-4 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="mb-3 flex w-full max-w-md items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffb4d9]">
                {card.rarity} · Card {card.id + 1} of 8
              </p>
              <h3 className="truncate text-lg font-black">{card.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenCard(null)}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/70 bg-white/15 text-xl active:scale-95"
              aria-label="Return to card album"
            >
              ✕
            </button>
          </div>
          <img
            src={card.image}
            alt={`${card.title} Barbie collector card, full view`}
            className="max-h-[78dvh] w-full max-w-md flex-1 object-contain"
          />
          <p className="mt-3 max-w-md text-center text-sm text-white/75">{card.story}</p>
        </div>
      ) : null}
    </div>
  );
}