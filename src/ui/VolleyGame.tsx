import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const ROUNDS = 8;
const TICK = 55;
const SWEET_LOW = 52;
const SWEET_HIGH = 86;

type VolleyGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function VolleyGame({ onClose, onMilestone, onFinish }: VolleyGameProps) {
  const [round, setRound] = useState(0);
  const [ballY, setBallY] = useState(4);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Bump the ball inside the net zone!');
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const ballRef = useRef(4);
  const lockRef = useRef(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    lockRef.current = false;
    ballRef.current = 4;
    setBallY(4);
    const speed = 3.2 + round * 0.55;
    const timer = setInterval(() => {
      if (lockRef.current) return;
      ballRef.current = Math.min(104, ballRef.current + speed);
      setBallY(ballRef.current);
      if (ballRef.current >= 104) {
        lockRef.current = true;
        setFeedback('Ball hit the sand! 🏖️');
        advanceRef.current = setTimeout(() => setRound(value => value + 1), 450);
      }
    }, TICK);
    return () => {
      clearInterval(timer);
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [round, finished]);

  const bump = () => {
    if (finished || lockRef.current) return;
    const y = ballRef.current;
    if (y < SWEET_LOW) {
      setFeedback('Too early — wait for the ball!');
      return;
    }
    if (y > SWEET_HIGH) {
      setFeedback('Too late — it is almost down!');
      return;
    }
    lockRef.current = true;
    const accuracy = 1 - Math.abs((SWEET_LOW + SWEET_HIGH) / 2 - y) / 40;
    const gained = Math.max(6, Math.round(8 + accuracy * 8));
    scoreRef.current += gained;
    setScore(scoreRef.current);
    setFeedback(`Clean rally! +${gained}`);
    milestoneRef.current();
    advanceRef.current = setTimeout(() => setRound(value => value + 1), 420);
  };

  return (
    <Panel
      title="Beach Volleyball"
      subtitle="Tap BUMP while the ball is inside the net zone"
      onClose={onClose}
    >
      {finished ? (
        <div className="animate-pop rounded-2xl bg-white/80 p-4 text-center">
          <p className="text-2xl">🏐☀️</p>
          <p className="mt-1 text-lg font-black text-[#c2186f]">{score} style points</p>
          <p className="text-[11px] font-semibold text-[#a04a7a]">
            What a rally — the whole beach is watching!
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
              Rally {Math.min(round + 1, ROUNDS)}/{ROUNDS}
            </span>
            <span>Score {score}</span>
          </div>
          <div className="relative h-[200px] overflow-hidden rounded-3xl border-2 border-white bg-gradient-to-b from-[#cdf3ff] via-[#ffe6bd] to-[#f5d3a1]">
            <div
              className="absolute inset-x-0 border-y-2 border-dashed border-[#ff2d8f] bg-[#7ff0c0]/45"
              style={{ top: `${SWEET_LOW}%`, height: `${SWEET_HIGH - SWEET_LOW}%` }}
            />
            <span
              className="absolute left-1/2 -translate-x-1/2 text-2xl"
              style={{ top: `${Math.min(ballY, 92)}%`, transition: `top ${TICK}ms linear` }}
            >
              🏐
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-2xl">🙆‍♀️</span>
          </div>
          <p className="mt-2 h-5 text-center text-xs font-black text-[#c2186f]">{feedback}</p>
          <button
            type="button"
            onClick={bump}
            className="mt-1 w-full rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffd873] to-[#ff9f2e] py-4 text-base font-black uppercase tracking-wider text-[#7a3c00] shadow active:scale-95"
          >
            Bump 🏐
          </button>
        </div>
      )}
    </Panel>
  );
}