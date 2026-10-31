import { useState } from 'react';
import { Panel } from '@/ui/Panel';

type MoodColor = {
  id: string;
  label: string;
  hex: string;
  emoji: string;
};

const MOODS: MoodColor[] = [
  { id: 'rose', label: 'Rose Glow', hex: '#ff5fa8', emoji: '💗' },
  { id: 'sky', label: 'Ocean Calm', hex: '#5ec9ff', emoji: '💙' },
  { id: 'gold', label: 'Golden Hour', hex: '#ffce4d', emoji: '💛' },
  { id: 'mint', label: 'Mint Pop', hex: '#7ff0c0', emoji: '💚' },
  { id: 'lilac', label: 'Lavender', hex: '#c99bff', emoji: '💜' },
];

type MoodPanelProps = {
  onClose: () => void;
  onMood: (color: number) => void;
  onFirstPick: () => void;
};

export function MoodPanel({ onClose, onMood, onFirstPick }: MoodPanelProps) {
  const [active, setActive] = useState('rose');
  const [found, setFound] = useState<string[]>(['rose']);

  const pick = (mood: MoodColor) => {
    const color = parseInt(mood.hex.slice(1), 16);
    setActive(mood.id);
    onMood(color);
    if (!found.includes(mood.id)) {
      setFound(list => [...list, mood.id]);
      onFirstPick();
    }
  };

  return (
    <Panel
      title="Living Room Mood Light"
      subtitle="Tap a glow to set the whole room's mood"
      onClose={onClose}
    >
      <div className="grid grid-cols-3 gap-2 pb-1">
        {MOODS.map(mood => (
          <button
            key={mood.id}
            type="button"
            onClick={() => pick(mood)}
            className={`flex h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-2 active:scale-95 ${
              active === mood.id
                ? 'border-[#ff2d8f] bg-white shadow-[0_6px_16px_rgba(255,45,143,0.3)]'
                : 'border-white bg-white/70'
            }`}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-lg"
              style={{
                background: mood.hex,
                boxShadow: `0 0 14px ${mood.hex}`,
              }}
            >
              {mood.emoji}
            </span>
            <span className="text-[9px] font-black leading-tight text-[#8a2c62]">
              {mood.label}
            </span>
            {!found.includes(mood.id) ? (
              <span className="text-[8px] font-black text-[#e09a1b]">+2 ✨</span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-[#a04a7a]">
        Discover every glow to light up the Dreamhouse in style!
      </p>
    </Panel>
  );
}