import { useState } from 'react';
import type {
  AccessoryId,
  HairId,
  OutfitId,
  ShoesId,
} from '@/game/types';
import { ChoiceRow, Panel } from '@/ui/Panel';

type WardrobeSheetProps = {
  title: string;
  outfit: OutfitId;
  hair: HairId;
  accessory: AccessoryId;
  shoes: ShoesId;
  unlocked: OutfitId[];
  points: number;
  notice: string | null;
  onOutfit: (id: OutfitId) => void;
  onHair: (id: HairId) => void;
  onAccessory: (id: AccessoryId) => void;
  onShoes: (id: ShoesId) => void;
  onClose: () => void;
};

const OUTFITS = [
  { id: 'glam', label: 'Glam Party', emoji: '👗', price: 0 },
  { id: 'beach', label: 'Beach Day', emoji: '🩱', price: 0 },
  { id: 'popstar', label: 'Popstar', emoji: '🎤', price: 40 },
  { id: 'casual', label: 'Designer', emoji: '🕶️', price: 25 },
];

const HAIRS = [
  { id: 'blonde', label: 'Golden Waves', emoji: '👱‍♀️' },
  { id: 'pink', label: 'Bubble Pony', emoji: '🎀' },
  { id: 'updo', label: 'Chic Updo', emoji: '💇‍♀️' },
];

const SHOES = [
  { id: 'heels', label: 'Pink Heels', emoji: '👠' },
  { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { id: 'boots', label: 'Gold Boots', emoji: '🥾' },
];

const ACCESSORIES = [
  { id: 'none', label: 'No Extra', emoji: '✨' },
  { id: 'sunglasses', label: 'Shades', emoji: '🕶️' },
  { id: 'tiara', label: 'Tiara', emoji: '👑' },
];

export function WardrobeSheet({
  title,
  outfit,
  hair,
  accessory,
  shoes,
  unlocked,
  points,
  notice,
  onOutfit,
  onHair,
  onAccessory,
  onShoes,
  onClose,
}: WardrobeSheetProps) {
  const [category, setCategory] = useState<'Outfits' | 'Hair' | 'Shoes' | 'Extras'>('Outfits');
  const categories = ['Outfits', 'Hair', 'Shoes', 'Extras'] as const;
  return (
    <Panel title={title} subtitle={`${points} style points · your look saves instantly`} onClose={onClose} variant="wardrobe">
      <div className="wardrobe-tabs" role="tablist" aria-label="Style category">
        {categories.map(item => <button key={item} type="button" role="tab" aria-selected={category === item} aria-controls="wardrobe-options" id={`wardrobe-tab-${item}`} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {notice ? <p className="wardrobe-notice" role="status">{notice}</p> : null}
      <div id="wardrobe-options" role="tabpanel" aria-labelledby={`wardrobe-tab-${category}`}>
        {category === 'Outfits' ? <ChoiceRow title="The wardrobe edit" items={OUTFITS} activeId={outfit} unlockedIds={unlocked} points={points} onSelect={id => onOutfit(id as OutfitId)} /> : null}
        {category === 'Hair' ? <ChoiceRow title="A fresh point of view" items={HAIRS} activeId={hair} onSelect={id => onHair(id as HairId)} /> : null}
        {category === 'Shoes' ? <ChoiceRow title="A perfect pair" items={SHOES} activeId={shoes} onSelect={id => onShoes(id as ShoesId)} /> : null}
        {category === 'Extras' ? <ChoiceRow title="The finishing touch" items={ACCESSORIES} activeId={accessory} onSelect={id => onAccessory(id as AccessoryId)} /> : null}
      </div>
    </Panel>
  );
}
