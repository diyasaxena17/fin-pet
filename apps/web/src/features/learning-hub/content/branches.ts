import type { Branch } from '../types';

/**
 * The seven branches of the tree, bottom to top. Unlock costs are thresholds on total
 * Golden Nuts EARNED (nothing is spent), so progress can never be lost by unlocking.
 * Positions and stems are tuned to the 360x430 tree scene in TreeScene.tsx.
 */
export const branches: Branch[] = [
  {
    id: 'budgeting',
    title: 'Budgeting',
    tag: 'DAILY MONEY',
    icon: 'wallet',
    unlockCost: 0,
    questIds: ['budget-like-a-boss'],
    pos: { x: 17.2, y: 74 },
    stem: { from: [172, 332], ctrl: [118, 334] },
  },
  {
    id: 'emergency-fund',
    title: 'Emergency Fund',
    tag: 'FOUNDATIONS',
    icon: 'shield',
    unlockCost: 0,
    questIds: ['emergency-fund-basics'],
    pos: { x: 82.8, y: 74 },
    stem: { from: [188, 332], ctrl: [242, 334] },
  },
  {
    id: 'tfsa',
    title: 'TFSA & Tax-Free Growth',
    tag: 'WEALTH BUILDING',
    icon: 'leaf',
    unlockCost: 40,
    questIds: ['tfsa-contribution-room', 'tfsa-avoid-overcontributing'],
    pos: { x: 14.4, y: 48 },
    stem: { from: [172, 304], ctrl: [96, 296] },
  },
  {
    id: 'tuition',
    title: 'Tuition & Student Debt',
    tag: 'FOUNDATIONS',
    icon: 'cap',
    unlockCost: 80,
    questIds: ['student-loans-101', 'tuition-tax-credit'],
    pos: { x: 85.6, y: 48 },
    stem: { from: [188, 304], ctrl: [264, 296] },
  },
  {
    id: 'investing-basics',
    title: 'Investing Basics',
    tag: 'INVESTING 101',
    icon: 'trend',
    unlockCost: 150,
    questIds: ['introduction-to-investing', 'understanding-stocks'],
    pos: { x: 29.2, y: 27 },
    stem: { from: [175, 292], ctrl: [140, 200] },
  },
  {
    id: 'funds-bonds',
    title: 'Funds & Bonds',
    tag: 'INVESTING 101',
    icon: 'layers',
    unlockCost: 240,
    questIds: ['mutual-funds-explained', 'bonds-demystified', 'etfs-vs-mutual-funds'],
    pos: { x: 70.8, y: 27 },
    stem: { from: [185, 292], ctrl: [220, 200] },
  },
  {
    id: 'strategy',
    title: 'Strategy',
    tag: 'INVESTMENT STRATEGY',
    icon: 'compass',
    unlockCost: 330,
    questIds: ['diversification-basics', 'index-funds-101'],
    pos: { x: 50, y: 14.4 },
    stem: { from: [180, 290], ctrl: [180, 170] },
  },
];
