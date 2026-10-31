import { useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

type Fruit = { id: string; label: string; emoji: string; color: string };

const FRUITS: Fruit[] = [
  { id: 'strawberry', label: 'Strawberry', emoji: '🍓', color: '#ff5f8f' },
  { id: 'mango', label: 'Mango', emoji: '🥭', color: '#ffce4d' },
  { id: 'blueberry', label: 'Blueberry', emoji: '🫐', color: '#6f8cff' },
  { id: 'kiwi', label: 'Kiwi', emoji: '🥝', color: '#8ee06a' },
  { id: 'coconut', label: 'Coconut', emoji: '🥥', color: '#f4e8d8' },
];

type KitchenGameProps = {
  onClose: () => void;
  onFinish: (score: number) => void;
};

export function KitchenGame({ onClose, onFinish }: KitchenGameProps) {
  const [cup, setCup] = useState<Fruit[]>([]);
  const [blending, setBlending] = useState(false);
  const [done, setDone] = useState<{ score: number; name: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  const addFruit = (fruit: Fruit) => {
    if (blending || done || cup.length >= 3) return;
    setCup(list => [...list, fruit]);
  };

  const blend = () => {
    if (cup.length === 0 || blending || done) return;
    setBlending(true);
    timerRef.current = window.setTimeout(() => {
      const unique = new Set(cup.map(f => f.id)).size;
      const score = 4 + unique * 2 + cup.length;
      const name = unique > 1 ? 'Rainbow Dream Smoothie' : `${cup[0].label} Smoothie`;
      setBlending(false);
      setDone({ score, name });
    }, 1300);
  };

  const reset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setCup([]);
    setBlending(false);
    setDone(null);
  };

  const finish = () => {
    if (!done) return;
    onFinish(done.score);
  };

  return (
    <Panel
      title="Dreamhouse Kitchen"
      subtitle="Pick up to 3 fruits, then blend a style-boosting smoothie"
      onClose={onClose}
    >
      <div className="mb-3 flex items-center justify-center gap-2">
        <div
          className={`grid h-20 w-20 place-items-center rounded-b-3xl rounded-t-lg border-4 border-white bg-white/60 text-2xl ${
            blending ? 'animate-bounce' : ''
          }`}
        >
          {done ? (
            <span className="text-center text-[10px] font-black leading-tight text-[#c2186f]">
              🥤<br />
              {done.name}
            </span>
          ) : cup.length === 0 ? (
            '🥤'
          ) : (
            <span className="text-xl">{cup.map(f => f.emoji).join('')}</span>
          )}
        </div>
        <div className="text-[10px] font-black text-[#a04a7a]">
          {cup.length}/3 fruits
          <br />
          {blending ? 'Blending…' : done ? 'Ready!' : 'Add fruit'}
        </div>
      </div>

      {!done ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {FRUITS.map(fruit => (
              <button
                key={fruit.id}
                type="button"
                onClick={() => addFruit(fruit)}
                disabled={blending || cup.length >= 3}
                className="flex h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-white bg-white/70 active:scale-95 disabled:opacity-40"
              >
                <span className="text-xl">{fruit.emoji}</span>
                <span className="text-[9px] font-black text-[#8a2c62]">{fruit.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={blend}
            disabled={cup.length === 0 || blending}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#ff2d8f] to-[#ff7ac2] py-3 text-sm font-black text-white shadow-[0_6px_16px_rgba(255,45,143,0.4)] active:scale-[0.98] disabled:opacity-40"
          >
            {blending ? 'Blending…' : 'BLEND IT!'}
          </button>
        </>
      ) : (
        <div className="text-center">
          <p className="mb-1 text-lg font-black text-[#c2186f]">+{done.score} style points ✨</p>
          <p className="mb-3 text-[11px] font-semibold text-[#a04a7a]">
            More fruit variety = more sparkle!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-2xl border-2 border-white bg-white/80 py-3 text-sm font-black text-[#c2186f] active:scale-[0.98]"
            >
              Make Another
            </button>
            <button
              type="button"
              onClick={finish}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#ff2d8f] to-[#ff7ac2] py-3 text-sm font-black text-white active:scale-[0.98]"
            >
              Enjoy It!
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}