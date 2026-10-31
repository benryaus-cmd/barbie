import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

type Item = { id: number; lane: number; y: number; kind: 'token' | 'ball' };

const TICK = 90;
const FALL = 8.5;
const ROUNDS = 9;
const LANES = [0, 1, 2];

type SlideGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function SlideGame({ onClose, onMilestone, onFinish }: SlideGameProps) {
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Steer with the arrows — grab every token!');
  const [finished, setFinished] = useState(false);
  const laneRef = useRef(1);
  const itemsRef = useRef<Item[]>([]);
  const scoreRef = useRef(0);
  const spawnRef = useRef(0);
  const idRef = useRef(0);
  const doneRef = useRef(false);
  const milestoneRef = useRef(onMilestone);

  useEffect(() => {
    milestoneRef.current = onMilestone;
  }, [onMilestone]);

  const steer = (dir: number) => {
    const next = Math.min(2, Math.max(0, laneRef.current + dir));
    laneRef.current = next;
    setLane(next);
  };

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      const next: Item[] = [];
      let gained = 0;
      let message: string | null = null;
      for (const item of itemsRef.current) {
        const y = item.y + FALL;
        if (y >= 76) {
          const hit = item.lane === laneRef.current;
          if (item.kind === 'token' && hit) {
            gained += 5;
            message = 'Style token collected! ✨';
          } else if (item.kind === 'ball' && hit) {
            gained -= 3;
            message = 'Ouch — bounced off a beach ball!';
          }
          continue;
        }
        next.push({ ...item, y });
      }
      if (spawnRef.current < ROUNDS && !next.some(item => item.y < 15)) {
        idRef.current += 1;
        spawnRef.current += 1;
        next.push({
          id: idRef.current,
          lane: Math.floor(Math.random() * 3),
          y: 0,
          kind: Math.random() < 0.3 ? 'ball' : 'token',
        });
      }
      itemsRef.current = next;
      setItems(next);
      if (gained !== 0) {
        scoreRef.current = Math.max(0, scoreRef.current + gained);
        setScore(scoreRef.current);
        if (gained > 0) milestoneRef.current();
      }
      if (message) setFeedback(message);
      if (spawnRef.current >= ROUNDS && next.length === 0 && !doneRef.current) {
        doneRef.current = true;
        setFinished(true);
      }
    }, TICK);
    return () => clearInterval(timer);
  }, [finished]);

  return (
    <Panel
      title="Pool Slide Rush"
      subtitle="Slide down and steer into floating style tokens"
      onClose={onClose}
    >
      {finished ? (
        <div className="animate-pop rounded-2xl bg-white/80 p-4 text-center">
          <p className="text-2xl">🛝💦</p>
          <p className="mt-1 text-lg font-black text-[#c2186f]">{score} style points</p>
          <p className="text-[11px] font-semibold text-[#a04a7a]">
            Splashdown! The pool party is cheering.
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
            <span>Tokens {score}</span>
            <span>Rides left {ROUNDS - spawnRef.current}</span>
          </div>
          <div className="relative h-[210px] overflow-hidden rounded-3xl border-2 border-white bg-gradient-to-b from-[#bdf0ff] via-[#7fd8ff] to-[#3fbdf6]">
            <div className="absolute inset-0 flex">
              {LANES.map(index => (
                <div key={index} className="h-full flex-1 border-x border-white/40" />
              ))}
            </div>
            {items.map(item => (
              <span
                key={item.id}
                className="absolute -translate-x-1/2 text-xl"
                style={{
                  left: `${(item.lane + 0.5) * 33.33}%`,
                  top: `${item.y}%`,
                  transition: `top ${TICK}ms linear`,
                }}
              >
                {item.kind === 'token' ? '💎' : '🏐'}
              </span>
            ))}
            <span
              className="absolute bottom-1 -translate-x-1/2 text-2xl"
              style={{
                left: `${(lane + 0.5) * 33.33}%`,
                transition: 'left 120ms ease-out',
              }}
            >
              🏄‍♀️
            </span>
          </div>
          <p className="mt-2 h-5 text-center text-xs font-black text-[#c2186f]">{feedback}</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => steer(-1)}
              className="flex-1 rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffd873] to-[#ff9f2e] py-4 text-xl font-black text-[#7a3c00] shadow active:scale-95"
              aria-label="Steer left"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => steer(1)}
              className="flex-1 rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffd873] to-[#ff9f2e] py-4 text-xl font-black text-[#7a3c00] shadow active:scale-95"
              aria-label="Steer right"
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}