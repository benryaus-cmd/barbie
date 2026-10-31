import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import type { PoseId } from '@/game/lifestyle-types';
import { Panel } from '@/ui/Panel';

const ROUNDS = 6;
const POSES: { id: PoseId; symbol: string; label: string }[] = [
  { id: 'wave', symbol: '↗', label: 'Wave' },
  { id: 'spin', symbol: '↻', label: 'Spin' },
  { id: 'peace', symbol: 'V', label: 'Peace' },
  { id: 'kiss', symbol: '♡', label: 'Blow kiss' },
];
type PhotoGameProps = {
  onClose(): void; onMilestone(): void; onFinish(score: number): void;
  onPose?(pose: PoseId): void; onCapture?(): void;
};
export function PhotoGame({ onClose, onMilestone, onFinish, onPose, onCapture }: PhotoGameProps) {
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(() => Math.floor(Math.random() * POSES.length));
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Listen to the photographer.');
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onMilestone, onPose, onCapture });
  useEffect(() => { callbacks.current = { onMilestone, onPose, onCapture }; }, [onMilestone, onPose, onCapture]);
  const advance = () => { setTarget(Math.floor(Math.random() * POSES.length)); setFeedback('Listen to the photographer.'); setRound(value => value + 1); };
  useEffect(() => {
    if (finished || round >= ROUNDS) { if (round >= ROUNDS) setFinished(true); return; }
    lockedRef.current = false;
    const limit = Math.max(1200, 2300 - round * 180);
    timerRef.current = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true; setFeedback('Missed the flash. Next pose!');
      advanceRef.current = setTimeout(advance, 350);
    }, limit);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); if (advanceRef.current) clearTimeout(advanceRef.current); };
  }, [round, finished]);
  const pose = (index: number) => {
    if (finished || lockedRef.current) return;
    lockedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    callbacks.current.onPose?.(POSES[index].id);
    const correct = index === target;
    if (correct) { scoreRef.current += 10; setScore(scoreRef.current); setFeedback('Picture perfect! +10'); callbacks.current.onMilestone(); }
    else setFeedback('A lovely pose — try the one called out!');
    // Give the scene a rendered frame in the selected pose before taking its real photo.
    advanceRef.current = setTimeout(() => { if (correct) callbacks.current.onCapture?.(); advance(); }, 360);
  };
  return <Panel title="Photo challenge" subtitle="Match the pose before the flash." onClose={onClose} variant="stage">
    {finished ? <div className="stage-result animate-pop"><div><span className="stage-eyebrow">COVER STAR ENERGY</span><strong>{score} <small>style points</small></strong></div><button type="button" onClick={() => onFinish(score)} className="stage-collect">Collect points <Camera size={17} /></button></div> : <div>
      <div className="stage-stats"><span>SHOT {Math.min(round + 1, ROUNDS)} <span className="stage-muted">/ {ROUNDS}</span></span><span>{score} PTS</span></div>
      <div className="photo-callout"><Camera size={15} /><span>Give me <strong>{POSES[target].label}!</strong></span></div>
      <div className="challenge-pose-strip">{POSES.map((option, index) => <button key={option.id} type="button" onClick={() => pose(index)} aria-label={`Pose ${option.label}`}><span aria-hidden="true">{option.symbol}</span><small>{option.label}</small></button>)}</div>
      <div className="stage-footer"><span role="status">{feedback}</span><span className="beat-progress" aria-label={`${round} of ${ROUNDS} photos complete`}><i style={{ width: `${round / ROUNDS * 100}%` }} /></span></div>
    </div>}
  </Panel>;
}
