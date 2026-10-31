import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

type Direction = 'left' | 'right';

const ROUNDS = 10;

type SurfGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function SurfGame({ onClose, onMilestone, onFinish }: SurfGameProps) {
  const [round, setRound] = useState(0);
  const [dir, setDir] = useState<Direction | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Tap the arrow the wave shows you');
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const lockedRef = useRef(true);
  const milestoneRef = useRef(onMilestone);

  useEffect(() => {
    milestoneRef.current = onMilestone;
  }, [onMilestone]);

  useEffect(() => {
    if (finished) return;
    if (round >= ROUNDS) {
      setFinished(true);
      return;
    }
    lockedRef.current = false;
    setDir(null);
    const nextDir: Direction = Math.random() < 0.5 ? 'left' : 'right';
    const showTimer = setTimeout(() => setDir(nextDir), 380);
    const limit = Math.max(760, 1450 - round * 70);
    const missTimer = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setFeedback('Wipeout! The wave rolled past 🌊');
      setRound(value => value + 1);
    }, limit);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(missTimer);
    };
  }, [round, finished]);

  const carve = (side: Direction) => {
    if (finished || lockedRef.current || dir === null) return;
    lockedRef.current = true;
    if (side === dir) {
      const gained = 7 + Math.min(6, round);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFeedback(`Smooth carve! +${gained}`);
      milestoneRef.current();
    } else {
      setFeedback('Wrong way — stay on the wave!');
    }
    setRound(value => value + 1);
  };

  return (
    <Panel
      title="Surf Challenge"
      subtitle="Carve the way the wave points, before it breaks"
      onClose={onClose}
    >
      {finished ? (
        <div className="animate-pop rounded-2xl bg-white/80 p-4 text-center">
          <p className="text-2xl">🏄‍♀️🌊</p>
          <p className="mt-1 text-lg font-black text-[#c2186f]">{score} style points</p>
          <p className="text-[11px] font-semibold text-[#a04a7a]">
            The beach crowd loved that ride!
          </p>
          <button
            type="button"
            onClick={() => onFinish(score)}
            className="mt-3 w-full rounded-2xl bg-gradient-to-b from-[#ff6bb0] to-[#ff2d8f] py-3 text-sm font-black text-white shadow active:scale-95"
          >
            Collect my points
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-[#a04a7a]">
            <span>
              Wave {Math.min(round + 1, ROUNDS)}/{ROUNDS}
            </span>
            <span>Score {score}</span>
          </div>
          <div className="relative grid h-[150px] place-items-center overflow-hidden rounded-3xl border-2 border-white bg-gradient-to-b from-[#bdf0ff] via-[#5ecbff] to-[#2aa8f0]">
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#fff3e4] to-transparent opacity-80" />
            <span className="animate-twinkle text-5xl">{dir === null ? '🌊' : '🏄‍♀️'}</span>
            <span className="absolute right-3 top-2 text-2xl">
              {dir === 'left' ? '⬅️' : dir === 'right' ? '➡️' : '…'}
            </span>
          </div>
          <p className="mt-2 h-5 text-center text-xs font-black text-[#c2186f]">{feedback}</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => carve('left')}
              className="flex-1 rounded-3xl border-2 border-white bg-gradient-to-b from-[#8fe4ff] to-[#3fbdf6] py-4 text-xl font-black text-white shadow active:scale-95"
              aria-label="Carve left"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => carve('right')}
              className="flex-1 rounded-3xl border-2 border-white bg-gradient-to-b from-[#8fe4ff] to-[#3fbdf6] py-4 text-xl font-black text-white shadow active:scale-95"
              aria-label="Carve right"
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}