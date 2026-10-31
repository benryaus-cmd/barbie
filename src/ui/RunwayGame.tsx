import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const SWEEP = 1500;
const CENTER = 0.66;
const ROUNDS = 6;
const POSES = [
  'Hands on Hips',
  'Supermodel Spin',
  'Wink & Wave',
  'Red Carpet Lean',
  'Star Pose',
  'Grand Finale',
];

type RunwayGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function RunwayGame({ onClose, onMilestone, onFinish }: RunwayGameProps) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(0);
  const lockedRef = useRef(false);
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (finished) return;
    startRef.current = performance.now();
    lockedRef.current = false;
    setFeedback(null);
    timerRef.current = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setFeedback('Too slow!');
      timerRef.current = setTimeout(() => setRound(value => value + 1), 420);
    }, SWEEP);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [round, finished]);

  useEffect(() => {
    if (round >= ROUNDS && !finished) setFinished(true);
  }, [round, finished]);

  const pose = () => {
    if (lockedRef.current || finished) return;
    const elapsed = performance.now() - startRef.current;
    const progress = Math.min(1, elapsed / SWEEP);
    const error = Math.abs(progress - CENTER);
    lockedRef.current = true;
    let gained = 0;
    if (error <= 0.09) {
      gained = 18;
      setFeedback('PERFECT POSE!');
    } else if (error <= 0.19) {
      gained = 10;
      setFeedback('Lovely pose!');
    } else {
      setFeedback('Off beat…');
    }
    if (gained > 0) {
      scoreRef.current += gained;
      setScore(scoreRef.current);
      onMilestone();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRound(value => value + 1), 460);
  };

  return (
    <Panel
      title="Fashion Runway"
      subtitle="Tap POSE when the sparkle hits the gold zone"
      onClose={onClose}
    >
      {finished ? (
        <div className="animate-pop rounded-2xl bg-white/80 p-4 text-center">
          <p className="text-2xl">💃✨</p>
          <p className="mt-1 text-lg font-black text-[#c2186f]">{score} style points</p>
          <p className="text-[11px] font-semibold text-[#a04a7a]">
            The runway crowd is obsessed with you.
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
          <div className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-[#a04a7a]">
            <span>
              Pose {Math.min(round + 1, ROUNDS)}/{ROUNDS}
            </span>
            <span>{POSES[Math.min(round, ROUNDS - 1)]}</span>
          </div>

          <div className="relative h-[52px] overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-r from-[#ffe3f1] via-white to-[#ffe3f1]">
            <div className="absolute inset-y-0 left-[57%] w-[18%] bg-gradient-to-b from-[#ffd873]/90 to-[#ffb02e]/90" />
            <div
              key={round}
              className="animate-sweep absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ff2d8f] text-center text-lg leading-8 shadow"
            >
              ✨
            </div>
          </div>

          <p className="mt-2 h-5 text-center text-sm font-black text-[#c2186f]">
            {feedback ?? ' '}
          </p>

          <button
            type="button"
            onClick={pose}
            className="mt-1 w-full rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffd873] to-[#ff9f2e] py-4 text-base font-black uppercase tracking-wider text-[#7a3c00] shadow active:scale-95"
          >
            Pose 💖
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-[#a04a7a]">
            Score so far: {score}
          </p>
        </div>
      )}
    </Panel>
  );
}