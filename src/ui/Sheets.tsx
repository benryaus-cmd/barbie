import type { AccessoryId, HairId, OutfitId, ShoesId } from '@/game/types';
import { DanceTilesGame } from '@/ui/DanceTilesGame';
import { DjGame } from '@/ui/DjGame';
import { KitchenGame } from '@/ui/KitchenGame';
import { LeaderboardSheet } from '@/ui/LeaderboardSheet';
import { MoodPanel } from '@/ui/MoodPanel';
import { PetGame } from '@/ui/PetGame';
import { PhotoGame } from '@/ui/PhotoGame';
import { RunwayGame } from '@/ui/RunwayGame';
import { SlideGame } from '@/ui/SlideGame';
import { SurfGame } from '@/ui/SurfGame';
import { VolleyGame } from '@/ui/VolleyGame';
import { WardrobeSheet } from '@/ui/WardrobeSheet';

export type PanelId =
  | 'none'
  | 'wardrobe'
  | 'boutique'
  | 'runway'
  | 'dj'
  | 'pet'
  | 'moodlight'
  | 'kitchen'
  | 'slide'
  | 'dancefloor'
  | 'surf'
  | 'volley'
  | 'photo'
  | 'leaderboard';

type SheetsProps = {
  panel: PanelId;
  points: number;
  earned: number;
  notice: string | null;
  syncing: boolean;
  outfit: OutfitId;
  hair: HairId;
  accessory: AccessoryId;
  shoes: ShoesId;
  unlocked: OutfitId[];
  onClose: () => void;
  onOutfit: (id: OutfitId) => void;
  onHair: (id: HairId) => void;
  onAccessory: (id: AccessoryId) => void;
  onShoes: (id: ShoesId) => void;
  onAward: (score: number, stopDancing?: boolean) => void;
  onMilestone: () => void;
  onPetAction: () => void;
  onSync: () => void;
  onMood: (color: number) => void;
  onBonus: (score: number) => void;
};

export function Sheets({
  panel,
  points,
  earned,
  notice,
  syncing,
  outfit,
  hair,
  accessory,
  shoes,
  unlocked,
  onClose,
  onOutfit,
  onHair,
  onAccessory,
  onShoes,
  onAward,
  onMilestone,
  onPetAction,
  onSync,
  onMood,
  onBonus,
}: SheetsProps) {
  if (panel === 'wardrobe' || panel === 'boutique') {
    return (
      <WardrobeSheet
        title={panel === 'boutique' ? 'Fashion Avenue Boutique' : 'Walk-in Closet'}
        outfit={outfit}
        hair={hair}
        accessory={accessory}
        shoes={shoes}
        unlocked={unlocked}
        points={points}
        notice={notice}
        onOutfit={onOutfit}
        onHair={onHair}
        onAccessory={onAccessory}
        onShoes={onShoes}
        onClose={onClose}
      />
    );
  }

  if (panel === 'runway') {
    return (
      <RunwayGame
        onClose={onClose}
        onMilestone={onMilestone}
        onFinish={score => onAward(score)}
      />
    );
  }

  if (panel === 'dj') {
    return (
      <DjGame
        onClose={onClose}
        onMilestone={onMilestone}
        onFinish={score => onAward(score, true)}
      />
    );
  }

  if (panel === 'pet') {
    return (
      <PetGame onClose={onClose} onAction={onPetAction} onFinish={score => onAward(score)} />
    );
  }

  if (panel === 'moodlight') {
    return (
      <MoodPanel
        onClose={onClose}
        onMood={onMood}
        onFirstPick={() => onBonus(2)}
      />
    );
  }

  if (panel === 'kitchen') {
    return <KitchenGame onClose={onClose} onFinish={score => onAward(score)} />;
  }

  if (panel === 'slide') {
    return (
      <SlideGame onClose={onClose} onMilestone={onMilestone} onFinish={score => onAward(score)} />
    );
  }

  if (panel === 'dancefloor') {
    return (
      <DanceTilesGame
        onClose={onClose}
        onMilestone={onMilestone}
        onFinish={score => onAward(score, true)}
      />
    );
  }

  if (panel === 'surf') {
    return (
      <SurfGame onClose={onClose} onMilestone={onMilestone} onFinish={score => onAward(score)} />
    );
  }

  if (panel === 'volley') {
    return (
      <VolleyGame onClose={onClose} onMilestone={onMilestone} onFinish={score => onAward(score)} />
    );
  }

  if (panel === 'photo') {
    return (
      <PhotoGame onClose={onClose} onMilestone={onMilestone} onFinish={score => onAward(score)} />
    );
  }

  if (panel === 'leaderboard') {
    return (
      <LeaderboardSheet
        total={earned}
        syncing={syncing}
        onSync={onSync}
        onClose={onClose}
      />
    );
  }

  return null;
}