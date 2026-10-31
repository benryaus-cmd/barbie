import type { SavedLook } from '@/game/lifestyle-save';
import type { Look, PoseId } from '@/game/lifestyle-types';
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
  | 'camera' | 'emotes' | 'resident' | 'pour' | 'netball' | 'salon' | 'makeup'
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
  savedLooks?:SavedLook[]; onSaveLook?:(name:string)=>void; onLoadLook?:(id:string)=>void; onDeleteLook?:(id:string)=>void; ownedColors?:string[]; onBuyColor?:(color:string)=>void;
  look:Look; ownedFashion:string[]; followers:number;
  onFashion:(slot:'top'|'bottom'|'accessory',id:string)=>void;
  onColor:(slot:'top'|'bottom',color:string)=>void;
  onPose:(pose:PoseId)=>void; onCapture:()=>void;
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
  panel, savedLooks,onSaveLook,onLoadLook,onDeleteLook,ownedColors,onBuyColor, look, ownedFashion, followers, onFashion, onColor, onPose, onCapture,
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
  if (['surf','pour','netball','salon','makeup','camera','emotes','resident','pet'].includes(panel)) return null;
  if (panel === 'wardrobe' || panel === 'boutique') {
    return (
      <WardrobeSheet
        title={panel === 'boutique' ? 'Fashion Avenue Boutique' : 'Walk-in Closet'}
        savedLooks={savedLooks} onSaveLook={onSaveLook} onLoadLook={onLoadLook} onDeleteLook={onDeleteLook} ownedColors={ownedColors} onBuyColor={onBuyColor}
        look={look} ownedFashion={ownedFashion} followers={followers} onFashion={onFashion} onColor={onColor}
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
      <RunwayGame onPose={onPose}
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
      <PhotoGame onPose={onPose} onCapture={onCapture} onClose={onClose} onMilestone={onMilestone} onFinish={score => onAward(score)} />
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