import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/ui/Panel';

const TARGETS = 10;

const PADS = [
  { label: 'BASS', symbol: '≋', color: '#f44b99' },
  { label: 'KEYS', symbol: '♮', color: '#479dc4' },
  { label: 'BEAT', symbol: '◉', color: '#df9f36' },
  { label: 'SYNTH', symbol: '⌁', color: '#9b71d4' },
];

type DjGameProps = {
  onClose: () => void;
  onMilestone: () => void;
  onFinish: (score: number) => void;
};

export function DjGame({ onClose, onMilestone, onFinish }: DjGameProps) {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(-1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const scoredRef = useRef(-1);

  useEffect(() => {
    if (finished) return;
    const delay = Math.max(430, 830 - step * 48);
    const timer = setTimeout(() => {
      if (step >= TARGETS) {
        setFinished(true);
        return;
      }
      setActive(Math.floor(Math.random() * PADS.length));
      setStep(value => value + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [step, finished]);

  const tap = (index: number) => {
    if (finished || active < 0) return;
    if (index !== active) return;
    if (scoredRef.current === step) return;
    scoredRef.current = step;
    scoreRef.current += 8;
    setScore(scoreRef.current);
    setActive(-1);
    onMilestone();
  };

  return (
    <Panel title="Dreamhouse DJ" subtitle="Your set. Your sound. Tap the glowing pad." onClose={onClose} variant="stage">
      {finished ? (
        <div className="stage-result animate-pop">
          <div><span className="stage-eyebrow">A SET TO REMEMBER</span><strong>{score} <small>style points</small></strong></div>
          <button type="button" onClick={() => onFinish(score)} className="stage-collect">Collect points <span aria-hidden="true">↗</span></button>
        </div>
      ) : (
        <div>
          <div className="stage-stats"><span>BEAT {Math.max(1, step)} <span className="stage-muted">/ {TARGETS}</span></span><span>{score} PTS</span></div>
          <div className="rhythm-pads">
            {PADS.map((pad, index) => (
              <button key={pad.label} type="button" onClick={() => tap(index)} className={`rhythm-pad ${active === index ? 'rhythm-pad-active' : ''}`} style={{ '--pad-color': pad.color } as import('react').CSSProperties} aria-label={`Pad ${index + 1}, ${pad.label}${active === index ? ', glowing' : ''}`}>
                <span aria-hidden="true">{pad.symbol}</span><small>{pad.label}</small>
              </button>
            ))}
          </div>
          <div className="stage-footer"><span>{active < 0 ? (step === 0 ? 'Get ready for your first beat…' : 'Perfect. Keep it going!') : 'Tap the light to build your set'}</span><span className="beat-progress" aria-label={`${step} of ${TARGETS} beats`}><i style={{ width: `${step / TARGETS * 100}%` }} /></span></div>
        </div>
      )}
    </Panel>
  );
}
