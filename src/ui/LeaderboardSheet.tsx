import { Panel } from '@/ui/Panel';

type LeaderboardSheetProps = {
  total: number;
  syncing: boolean;
  onSync: () => void;
  onClose: () => void;
};

export function LeaderboardSheet({
  total,
  syncing,
  onSync,
  onClose,
}: LeaderboardSheetProps) {
  return (
    <Panel
      title="Dreamland Leaderboard"
      subtitle="Ranked by total style points earned"
      onClose={onClose}
    >
      <div className="mb-3 rounded-3xl border-2 border-white bg-gradient-to-b from-[#ff2d8f] to-[#c2186f] p-4 text-center text-white shadow-[0_10px_24px_rgba(194,24,111,0.35)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
          Your style score
        </p>
        <p className="mt-1 text-4xl font-black tabular-nums">{total}</p>
        <p className="mt-1 text-[11px] font-semibold text-white/85">
          {syncing ? 'Syncing your score…' : 'Live score synced to the leaderboard'}
        </p>
      </div>

      <div className="space-y-2">
        {[
          { icon: '💃', title: 'Fashion Runway', text: 'Pose on beat for up to 108 points' },
          { icon: '🪩', title: 'Dreamhouse DJ Party', text: 'Hit the beat for 80 points' },
          { icon: '🐾', title: 'Pet Pampering', text: 'Complete a spa day for 30 points' },
          { icon: '🛍️', title: 'Boutique & Beach', text: 'Unlock looks and grab beach rewards' },
        ].map(row => (
          <div
            key={row.title}
            className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/70 px-3 py-2"
          >
            <span className="text-lg">{row.icon}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-black leading-tight text-[#8a2c62]">
                {row.title}
              </p>
              <p className="text-[10px] leading-tight text-[#a04a7a]">{row.text}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        className="mt-3 w-full rounded-2xl bg-gradient-to-b from-[#ff6bb0] to-[#ff2d8f] py-3 text-sm font-black text-white shadow active:scale-95 disabled:opacity-60"
      >
        {syncing ? 'Syncing…' : 'Sync my score'}
      </button>
    </Panel>
  );
}