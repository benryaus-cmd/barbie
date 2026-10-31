import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const ROUNDS = 6;

const POSES = [
  { id: 'wave', emoji: '👋', label: 'Wave' },
  { id: 'spin', emoji: '💫', label: 'Spin' },
  { id: 'peace', emoji: '✌️', label: 'Peace' },
  { id: 'heart', emoji: '🫶', label: 'Blow Kiss' },
];

type PhotoGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function PhotoGame({ onClose, onMilestone, onFinish }: PhotoGameProps) {
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(
    'Match the pose the photographer calls out'
  );
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);
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
    setTarget(Math.floor(Math.random() * POSES.length));
    setFeedback(null);
    const limit = Math.max(1200, 2300 - round * 180);
    const timer = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setFeedback('Too slow — the flash missed you!');
      setRound(value => value + 1);
    }, limit);
    return () => clearTimeout(timer);
  }, [round, finished]);

  const pose = (index: number) => {
    if (finished || lockedRef.current) return;
    lockedRef.current = true;
    if (index === target) {
      const gained = 10;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFeedback(`Gorgeous! +${gained}`);
      milestoneRef.current();
    } else {
      setFeedback('Wrong pose — the shot is blurry!');
    }
    setRound(value => value + 1);
  };

  return (
    <Panel
      title="Glam Photo Booth"
      subtitle="Hit the pose before the camera flash"
      onClose={onClose}
    >
      {finished ? (
        <div className="animate-pop rounded-2xl bg-white/80 p-4 text-center">
          <p className="text-2xl">📸✨</p>
          <p className="mt-1 text-lg font-black text-[#c2186f]">{score} style points</p>
          <p className="text-[11px] font-semibold text-[#a04a7a]">
            Those shots are going straight to the cover!
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
              Shot {Math.min(round + 1, ROUNDS)}/{ROUNDS}
            </span>
            <span>Score {score}</span>
          </div>
          <div className="mb-2 grid h-[104px] place-items-center rounded-3xl border-2 border-white bg-gradient-to-b from-[#ffe3f1] to-[#ffb8dc]">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#c2186f]">
                Photographer wants
              </p>
              <p className="text-3xl leading-tight">{POSES[target].emoji}</p>
              <p className="text-[11px] font-black text-[#8a2c62]">{POSES[target].label}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POSES.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => pose(index)}
                className="flex h-[70px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-white bg-white/80 shadow active:scale-95"
              >
                <span className="text-xl">{option.emoji}</span>
                <span className="text-[10px] font-black text-[#8a2c62]">{option.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 h-5 text-center text-xs font-black text-[#c2186f]">{feedback ?? ' '}</p>
        </div>
      )}
    </Panel>
  );
}