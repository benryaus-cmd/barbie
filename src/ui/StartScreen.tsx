import assetsData from "@/config/assets";
import { useState } from 'react';
type StartScreenProps = {
  loading: boolean;
  onStart: () => void;
};
const SPARKLES = Array.from({
  length: 18
}, (_, index) => index);
const FEATURES = [{
  icon: '⌂',
  label: 'Dreamhouse'
}, {
  icon: '☼',
  label: 'Glam Beach'
}, {
  icon: '✦',
  label: 'Fashion Ave'
}];
export function StartScreen({
  loading,
  onStart
}: StartScreenProps) {
  const [artFailed, setArtFailed] = useState(false);
  return <main className="dream-title pointer-events-auto absolute inset-0 z-50 flex flex-col items-center overflow-hidden px-5 text-center">
      <div className="title-sunburst" aria-hidden="true" />
      <div className="title-glow-orb" aria-hidden="true" />
      <div className="title-sparkle-field" aria-hidden="true">
        {SPARKLES.map(index => <span key={index} className={`title-sparkle title-sparkle-${index % 4}`} style={{
        left: `${(index * 47 + 9) % 100}%`,
        top: `${(index * 61 + 7) % 90}%`,
        animationDelay: `${index % 7 * -0.42}s`,
        animationDuration: `${2.2 + index % 5 * 0.48}s`
      }}>
            {index % 3 === 0 ? '✦' : '✧'}
          </span>)}
      </div>

      <div className="title-copy relative z-10 mt-[max(5vh,28px)]">
        <p className="title-eyebrow">A world made for your dreams</p>
        <h1 className="title-logo">
          <span className="title-barbie">Barbie</span>
          <span className="title-dreamland">ULTIMATE DREAMLAND</span>
        </h1>
        <p className="title-description">
          Dress up, explore, and make every moment sparkle.
        </p>
      </div>

      <div className="title-hero relative z-[1]" aria-hidden="true">
        <div className="title-hero-ring" />
        {artFailed ? (
          <div className="title-art-placeholder" aria-label="Barbie artwork placeholder">
            <span className="title-placeholder-star" aria-hidden="true">✦</span>
            <span className="title-placeholder-letter" aria-hidden="true">B</span>
            <span className="title-placeholder-caption">Your dream look</span>
          </div>
        ) : (
          <img
            className="title-art"
            src={assetsData.title_screen_barbie_art}
            alt=""
            draggable={false}
            onError={() => setArtFailed(true)}
          />
        )}
        <span className="title-art-spark title-art-spark-one">✦</span>
        <span className="title-art-spark title-art-spark-two">✧</span>
        <span className="title-art-spark title-art-spark-three">✦</span>
      </div>

      <div className="title-features relative z-10">
        {FEATURES.map(item => <div className="title-feature" key={item.label}>
            <span className="title-feature-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>)}
      </div>

      <button type="button" onClick={onStart} disabled={loading} className="title-play relative z-10 mt-5 shrink-0">
        <span>{loading ? 'Opening your dream…' : 'Step into your dream'}</span>
        <span className="title-play-star" aria-hidden="true">✦</span>
      </button>
      <p className="title-footer relative z-10">YOUR DREAM. YOUR STYLE. YOUR WORLD.</p>
    </main>;
}