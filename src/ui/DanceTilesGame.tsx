import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const PADS = [
  { label: 'POSE', symbol: '↖', color: '#f44b99' },
  { label: 'GLOW', symbol: '◇', color: '#df9f36' },
  { label: 'VOGUE', symbol: '✧', color: '#479dc4' },
  { label: 'SPIN', symbol: '↗', color: '#9b71d4' },
];

const HITS = 12;

type DanceTilesGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function DanceTilesGame({ onClose, onMilestone, onFinish }: DanceTilesGameProps) {
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Tap the glowing tile on the beat!');
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);
  const milestoneRef = useRef(onMilestone);

  useEffect(() => {
    milestoneRef.current = onMilestone;
  }, [onMilestone]);

  useEffect(() => {
    if (finished) return;
    if (hits >= HITS) {
      setFinished(true);
      return;
    }
    setActive(Math.floor(Math.random() * PADS.length));
    lockedRef.current = false;
    const beatMs = Math.max(430, 950 - hits * 45);
    const timer = setTimeout(() => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setCombo(0);
      setFeedback('Missed the beat!');
      setHits(value => value + 1);
    }, beatMs);
    return () => clearTimeout(timer);
  }, [hits, finished]);

  const tap = (index: number) => {
    if (finished || lockedRef.current) return;
    lockedRef.current = true;
    if (index !== active) {
      setCombo(0);
      setFeedback('Wrong tile — stay on the beat!');
      setHits(value => value + 1);
      return;
    }
    const nextCombo = combo + 1;
    const gained = 6 + Math.min(8, nextCombo * 2);
    setCombo(nextCombo);
    scoreRef.current += gained;
    setScore(scoreRef.current);
    setFeedback(`Perfect move! +${gained}`);
    milestoneRef.current();
    setHits(value => value + 1);
  };

  return (
    <Panel title="Dance floor" subtitle="Follow the light. Find your rhythm." onClose={onClose} variant="stage">
      {finished ? (
        <div className="stage-result animate-pop">
          <div><span className="stage-eyebrow">THAT’S YOUR MOMENT</span><strong>{score} <small>style points</small></strong></div>
          <button type="button" onClick={() => onFinish(score)} className="stage-collect">Collect points <span aria-hidden="true">↗</span></button>
        </div>
      ) : (
        <div>
          <div className="stage-stats"><span>BEAT {Math.min(hits + 1, HITS)} <span className="stage-muted">/ {HITS}</span></span><span>{score} PTS <span className="stage-combo">×{combo}</span></span></div>
          <div className="rhythm-pads">
            {PADS.map((pad, index) => (
              <button key={pad.label} type="button" onClick={() => tap(index)} className={`rhythm-pad ${active === index ? 'rhythm-pad-active' : ''}`} style={{ '--pad-color': pad.color } as import('react').CSSProperties} aria-label={`Dance tile ${index + 1}, ${pad.label}${active === index ? ', glowing' : ''}`}>
                <span aria-hidden="true">{pad.symbol}</span><small>{pad.label}</small>
              </button>
            ))}
          </div>
          <div className="stage-footer"><span role="status">{feedback}</span><span className="beat-progress" aria-label={`${hits} of ${HITS} beats complete`}><i style={{ width: `${hits / HITS * 100}%` }} /></span></div>
        </div>
      )}
    </Panel>
  );
}
