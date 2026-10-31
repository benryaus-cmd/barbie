import { useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const PETS = [
  { id: 'puppy', label: 'Puppy', emoji: '🐶' },
  { id: 'kitten', label: 'Kitten', emoji: '🐱' },
];

const ACTIONS = [
  { id: 'feed', label: 'Feed', emoji: '🍖' },
  { id: 'groom', label: 'Groom', emoji: '🫧' },
  { id: 'dress', label: 'Dress up', emoji: '🎀' },
];

type PetGameProps = {
  onClose: () => void;
  onAction: () => void;
  onFinish: (score: number) => void;
};

export function PetGame({ onClose, onAction, onFinish }: PetGameProps) {
  const [pet, setPet] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(0);
  const scoreRef = useRef(0);

  const act = (id: string) => {
    if (!pet || done.includes(id)) return;
    const next = [...done, id];
    const bonus = next.length === ACTIONS.length ? 15 : 0;
    scoreRef.current += 5 + bonus;
    setScore(scoreRef.current);
    setDone(next);
    setHearts(value => value + 1);
    onAction();
  };

  const complete = done.length === ACTIONS.length;

  return (
    <Panel
      title="Pet Pampering"
      subtitle={pet ? 'Give your pet the full spa day' : 'Choose your companion'}
      onClose={onClose}
    >
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        {PETS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPet(item.id)}
            className={`flex flex-col items-center gap-1 rounded-3xl border-2 py-3 active:scale-95 ${
              pet === item.id
                ? 'border-[#ff2d8f] bg-white shadow-[0_6px_16px_rgba(255,45,143,0.3)]'
                : 'border-white bg-white/60'
            }`}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-[11px] font-black text-[#8a2c62]">{item.label}</span>
          </button>
        ))}
      </div>

      {pet ? (
        <div className="animate-pop">
          <div className="relative mb-3 grid h-[104px] place-items-center overflow-hidden rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffe3f1] to-[#ffd0e8]">
            <span className="text-5xl">{pet === 'puppy' ? '🐶' : '🐱'}</span>
            <span key={hearts} className="animate-float-up absolute right-4 top-6 text-lg">
              💗
            </span>
            <span className="absolute bottom-2 text-[10px] font-black uppercase tracking-widest text-[#c2186f]">
              {done.length}/{ACTIONS.length} pampered
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {ACTIONS.map(action => {
              const used = done.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => act(action.id)}
                  disabled={used}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 active:scale-95 ${
                    used
                      ? 'border-white bg-white/40 opacity-50'
                      : 'border-white bg-white/80'
                  }`}
                >
                  <span className="text-2xl">{action.emoji}</span>
                  <span className="text-[10px] font-black text-[#8a2c62]">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold text-[#a04a7a]">
            Score: {score} style points
          </p>
          {complete ? (
            <button
              type="button"
              onClick={() => onFinish(score)}
              className="animate-pop mt-2 w-full rounded-2xl bg-gradient-to-b from-[#ff6bb0] to-[#ff2d8f] py-3 text-sm font-black text-white shadow active:scale-95"
            >
              Collect my points
            </button>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}