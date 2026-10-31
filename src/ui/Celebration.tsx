import { useEffect, useRef } from 'react';

type CelebrationProps = {
  title: string;
  subtitle: string;
  onDone: () => void;
};

const CONFETTI = ['💖', '✨', '🌟', '🎀', '💎', '🦋', '👑', '🌸'];

export function Celebration({ title, subtitle, onDone }: CelebrationProps) {
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(() => doneRef.current(), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {CONFETTI.map((emoji, index) => (
        <span
          key={`${emoji}-${index}`}
          className="animate-drop absolute text-2xl"
          style={{
            left: `${6 + index * 11.5}%`,
            animationDelay: `${index * 0.16}s`,
          }}
        >
          {emoji}
        </span>
      ))}
      <div className="animate-pop-slow absolute inset-x-6 top-1/3 rounded-3xl border-2 border-white bg-gradient-to-b from-[#ff2d8f]/95 to-[#c2186f]/95 px-4 py-5 text-center text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/80">
          Signature moment
        </p>
        <p className="mt-1 text-xl font-black leading-tight">{title}</p>
        <p className="mt-1 text-[11px] font-semibold text-white/90">{subtitle}</p>
      </div>
    </div>
  );
}