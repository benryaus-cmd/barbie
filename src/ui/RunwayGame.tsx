import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { PoseId } from '@/game/lifestyle-types';
import { Panel } from '@/ui/Panel';

const SWEEP = 1500;
const CENTER = 0.66;
const POSES: { id: PoseId; label: string }[] = [
  { id: 'peace', label: 'Cover star' }, { id: 'spin', label: 'Supermodel spin' },
  { id: 'wave', label: 'Wink & wave' }, { id: 'kiss', label: 'Red carpet kiss' },
  { id: 'heart', label: 'Love the crowd' }, { id: 'spin', label: 'Grand finale' },
];
const ROUNDS = POSES.length;
type RunwayGameProps = { onClose(): void; onMilestone(): void; onFinish(score: number): void; onPose?(pose: PoseId): void };
export function RunwayGame({ onClose, onMilestone, onFinish, onPose }: RunwayGameProps) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(0);
  const lockedRef = useRef(false);
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (finished || round >= ROUNDS) { if (round >= ROUNDS) setFinished(true); return; }
    startRef.current = performance.now(); lockedRef.current = false; setFeedback(null);
    timerRef.current = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true; setFeedback('Missed the spotlight!');
      timerRef.current = setTimeout(() => setRound(value => value + 1), 420);
    }, SWEEP);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [round, finished]);
  const pose = () => {
    if (lockedRef.current || finished) return;
    const progress = Math.min(1, (performance.now() - startRef.current) / SWEEP);
    const error = Math.abs(progress - CENTER);
    lockedRef.current = true; onPose?.(POSES[Math.min(round, ROUNDS - 1)].id);
    const gained = error <= 0.09 ? 18 : error <= 0.19 ? 10 : 0;
    setFeedback(gained === 18 ? 'Perfect pose! +18' : gained ? 'Lovely pose! +10' : 'Find the golden spotlight!');
    if (gained) { scoreRef.current += gained; setScore(scoreRef.current); onMilestone(); }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRound(value => value + 1), 460);
  };
  return <Panel title="Fashion runway" subtitle="Pose as the sparkle reaches the gold zone." onClose={onClose} variant="stage">
    {finished ? <div className="stage-result animate-pop"><div><span className="stage-eyebrow">YOU OWNED THE RUNWAY</span><strong>{score} <small>style points</small></strong></div><button type="button" onClick={() => onFinish(score)} className="stage-collect">Collect points <Sparkles size={17} /></button></div> : <div>
      <div className="stage-stats"><span>POSE {Math.min(round + 1, ROUNDS)} <span className="stage-muted">/ {ROUNDS}</span></span><span>{POSES[Math.min(round, ROUNDS - 1)].label}</span></div>
      <div className="runway-meter"><div className="runway-gold" /><div key={round} className="animate-sweep runway-spark"><Sparkles size={21} /></div></div>
      <button type="button" onClick={pose} className="runway-pose"><Sparkles size={17} />Strike a pose</button>
      <div className="stage-footer"><span role="status">{feedback ?? 'Wait for your golden moment…'}</span><span>{score} pts</span></div>
    </div>}
  </Panel>;
}
