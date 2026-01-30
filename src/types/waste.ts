export type WasteCategory = 
  | 'clothing'      // Clothing/textiles - Purple bin
  | 'electronics'   // E-waste (phones, earbuds, cases) - Orange special
  | 'compost'       // Food/organic waste - Green bin
  | 'recyclable'    // Recyclables - Blue bin
  | 'hazardous'     // Hazardous waste (batteries, bulbs, chemicals) - Red bin
  | 'other';        // General/dry waste - Grey bin

export type DisposalChoice = 'donate' | 'trade' | 'recycle' | 'discard' | 'special';

export type ScanStatus = 'pending' | 'approved' | 'rejected';

export interface WasteItem {
  id: string;
  name: string;
  category: WasteCategory;
  points: number;
  scannedAt: Date;
  imageUrl?: string;
  status: ScanStatus;
  disposalChoice?: DisposalChoice;
  basePoints: number;
  finalPoints: number;
  aiSuggestion?: string;
  craftImageUrl?: string;
  canTrade?: boolean;
  hasCreativePotential?: boolean;
  creativeSuggestion?: string | null;
  isHuman?: boolean;
  humanGender?: 'male' | 'female' | null;
  isRetry?: boolean; // Failed to identify, prompt user to retry
}

export interface UserStats {
  totalPoints: number;
  level: number;
  scansToday: number;
  streak: number;
  itemsRecycled: number;
  pendingPoints: number;
}

export const categoryInfo: Record<WasteCategory, {
  label: string;
  labelCn: string;
  color: string;
  binColor: string;
  icon: string;
  tip: string;
  tipCn: string;
  needsChoice: boolean;
  choices?: { value: DisposalChoice; label: string; labelCn: string; pointsMultiplier: number; isPrimary?: boolean }[];
}> = {
  clothing: {
    label: 'Clothing',
    labelCn: '衣物',
    color: 'hsl(280 60% 55%)',    // Purple
    binColor: '#8E24AA',           // Purple bin
    icon: '👕',
    tip: 'Donate or sell for bonus points!',
    tipCn: '捐赠或出售可获得额外积分！',
    needsChoice: true,
    choices: [
      { value: 'donate', label: 'Donate', labelCn: '捐赠', pointsMultiplier: 2, isPrimary: true },
      { value: 'trade', label: 'Sell/Trade', labelCn: '出售/交换', pointsMultiplier: 1.8, isPrimary: true },
      { value: 'discard', label: 'Discard', labelCn: '丢弃', pointsMultiplier: 1 },
    ],
  },
  electronics: {
    label: 'Electronics',
    labelCn: '电子产品',
    color: 'hsl(25 90% 55%)',     // Orange
    binColor: '#F57C00',          // Orange special
    icon: '📱',
    tip: 'Trade or recycle at e-waste center!',
    tipCn: '出售或送至电子垃圾回收点！',
    needsChoice: true,
    choices: [
      { value: 'trade', label: 'Sell/Trade', labelCn: '出售/交换', pointsMultiplier: 2, isPrimary: true },
      { value: 'recycle', label: 'E-waste Recycle', labelCn: '电子回收', pointsMultiplier: 1.5, isPrimary: true },
      { value: 'discard', label: 'Discard', labelCn: '丢弃', pointsMultiplier: 0.5 },
    ],
  },
  compost: {
    label: 'Food Waste',
    labelCn: '厨余垃圾',
    color: 'hsl(142 60% 40%)',    // Green
    binColor: '#43A047',          // Green bin
    icon: '🥬',
    tip: 'Great for composting!',
    tipCn: '适合堆肥！',
    needsChoice: true,
    choices: [
      { value: 'recycle', label: 'Compost', labelCn: '堆肥回收', pointsMultiplier: 1.5, isPrimary: true },
      { value: 'discard', label: 'Discard', labelCn: '丢弃', pointsMultiplier: 1 },
    ],
  },
  recyclable: {
    label: 'Recyclable',
    labelCn: '可回收物',
    color: 'hsl(210 80% 50%)',    // Blue
    binColor: '#1E88E5',          // Blue bin
    icon: '♻️',
    tip: 'Clean and recycle!',
    tipCn: '清洁后回收！',
    needsChoice: true,
    choices: [
      { value: 'trade', label: 'Sell', labelCn: '出售', pointsMultiplier: 1.5, isPrimary: true },
      { value: 'recycle', label: 'Recycle', labelCn: '回收', pointsMultiplier: 1.5, isPrimary: true },
      { value: 'discard', label: 'Discard', labelCn: '丢弃', pointsMultiplier: 1 },
    ],
  },
  hazardous: {
    label: 'Hazardous',
    labelCn: '有害垃圾',
    color: 'hsl(0 70% 50%)',      // Red
    binColor: '#E53935',          // Red bin
    icon: '⚠️',
    tip: 'Take to hazardous waste collection point!',
    tipCn: '请送至有害垃圾回收点！',
    needsChoice: true,
    choices: [
      { value: 'special', label: 'Specialized Disposal', labelCn: '专业回收', pointsMultiplier: 2, isPrimary: true },
      // No discard option for hazardous waste!
    ],
  },
  other: {
    label: 'Dry Waste',
    labelCn: '其他垃圾',
    color: 'hsl(0 0% 50%)',       // Grey
    binColor: '#757575',          // Grey bin
    icon: '🗑️',
    tip: 'Place in general waste bin.',
    tipCn: '放入其他垃圾桶。',
    needsChoice: false,
  },
};
