// --- INITIAL SKILL TREE DATA (3 PILLARS + CANADIAN STUDENT/YOUNG ADULT TOPICS) ---
export const INITIAL_BRANCHES = [
  {
    id: 'budgeting',
    title: 'Budgeting & Cash Flow',
    subtitle: 'Roots & Lower Trunk',
    pillar: 'Smart Budget Tracking',
    color: '#2D6A4F',
    accent: '#52B788',
    unlocked: true,
    coords: { x: 145, y: 315 },
    labelPos: { x: 48, y: 332, align: 'left' },
    lessons: [
      {
        id: 'b1',
        title: '50/30/20 Acorn Split',
        duration: '2 min',
        reward: 25,
        completed: true,
        summary: 'Divide every paycheque automatically: 50% Needs (rent, groceries), 30% Wants, and 20% Winter Stash (savings & debt).',
        challengeType: 'quiz',
        question: 'You just got a $1,000 co-op paycheque. Using the 50/30/20 rule, how much goes straight into your Winter Stash (savings/TFSA)?',
        options: [
          { text: '$100 (10%)', correct: false },
          { text: '$200 (20%)', correct: true },
          { text: '$350 (35%)', correct: false }
        ],
        explanation: 'Spot on! Locking away 20% ($200) on payday prevents the "Payday-to-Splurge Latency" trap.'
      },
      {
        id: 'b2',
        title: 'Beat Late-Night Impulse Spree',
        duration: '2 min',
        reward: 30,
        completed: false,
        summary: 'Data shows 68% of buyer’s remorse happens between 11 PM and 3 AM due to decision fatigue. Put carts in a 48-hr vault!',
        challengeType: 'scenario',
        question: 'It is 12:40 AM during finals week. You have a $34 food delivery cart open. What earns you +30 Golden Nuts?',
        options: [
          { text: 'Order now & promise to skip lunch tomorrow', correct: false },
          { text: 'Drop it in the 48-Hr Wishlist Vault & drink water', correct: true },
          { text: 'Add a $12 dessert to hit free delivery', correct: false }
        ],
        explanation: 'Resisting late-night dopamine spikes boosts your Impulse Resistance Score and keeps your hardware squirrel dancing!'
      }
    ]
  },
  {
    id: 'tuition',
    title: 'Tuition & Student Planning',
    subtitle: 'Mid-Left Canopy Branch',
    pillar: 'Gamified Financial Planning',
    color: '#B45309',
    accent: '#F59E0B',
    unlocked: true,
    coords: { x: 118, y: 205 },
    labelPos: { x: 24, y: 170, align: 'left' },
    lessons: [
      {
        id: 't1',
        title: 'OSAP, Grants & Bursaries 101',
        duration: '3 min',
        reward: 30,
        completed: true,
        summary: 'Grants are free acorns you never repay; loans accrue federal/provincial rules. Always submit your school’s general bursary profile!',
        challengeType: 'quiz',
        question: 'Which funding source reduces your net tuition cost without needing to be paid back after graduation?',
        options: [
          { text: 'Non-repayable Grants & Need-Based Bursaries', correct: true },
          { text: 'Student Line of Credit', correct: false },
          { text: 'Buy-Now-Pay-Later Textbook Plans', correct: false }
        ],
        explanation: 'Grants & bursaries are pure free fuel for your financial tree—many go unclaimed every semester!'
      },
      {
        id: 't2',
        title: 'Semester Cash-Flow Sinking Fund',
        duration: '2 min',
        reward: 35,
        completed: false,
        summary: 'Instead of panicking in September and January, split semester fees & textbooks into bi-weekly micro-transfers.',
        challengeType: 'slider',
        question: 'You need $800 for next term’s books & lab fees in 16 weeks (8 bi-weekly pay periods). Slide to set the right bi-weekly stash:',
        targetValue: 100,
        min: 25,
        max: 200,
        step: 25,
        unit: '$',
        explanation: '$100 every two weeks × 8 paycheques = $800 ready stress-free before classes even start!'
      }
    ]
  },
  {
    id: 'tfsa',
    title: 'TFSA & Tax-Free Growth',
    subtitle: 'Mid-Right Canopy Branch',
    pillar: 'Wealth Building',
    color: '#1B4332',
    accent: '#40916C',
    unlocked: true,
    coords: { x: 255, y: 192 },
    labelPos: { x: 242, y: 152, align: 'right' },
    lessons: [
      {
        id: 'tf1',
        title: 'TFSA Contribution Room Magic',
        duration: '2 min',
        reward: 30,
        completed: false,
        summary: 'A Tax-Free Savings Account (TFSA) isn’t just for cash—you can hold ETFs & GICs inside it, and every dollar of growth is 100% tax-free!',
        challengeType: 'quiz',
        question: 'If your TFSA investments grow by $2,500 this year and you withdraw it later, how much income tax do you pay on those gains?',
        options: [
          { text: '$0 — All TFSA growth & withdrawals are tax-free', correct: true },
          { text: '50% capital gains inclusion tax', correct: false },
          { text: '15% withholding penalty', correct: false }
        ],
        explanation: 'Zero! Plus, any amount you withdraw is added back to your TFSA contribution room on January 1st of the next year.'
      },
      {
        id: 'tf2',
        title: 'Compound Acorn Snowball',
        duration: '3 min',
        reward: 40,
        completed: false,
        summary: 'Starting at age 20 instead of 30 lets compounding do the heavy lifting. Even $50 bi-weekly inside a diversified TFSA builds massive oak roots.',
        challengeType: 'slider',
        question: 'At 7% average annual return, saving $100/month in your TFSA from age 20 to 30 (just $12,000 contributed) grows to roughly:',
        targetValue: 17300,
        min: 12000,
        max: 22000,
        step: 100,
        unit: '$',
        explanation: '~$17,300! Over $5,300 of free compound growth—completely sheltered from taxes inside your TFSA.'
      }
    ]
  },
  {
    id: 'investing',
    title: 'Investing & Emergency Stash',
    subtitle: 'Crown Canopy (420 Nuts)',
    pillar: 'Long-Term Resilience',
    color: '#7C2D12',
    accent: '#EA580C',
    unlocked: false,
    unlockCost: 420,
    coords: { x: 188, y: 102 },
    labelPos: { x: 188, y: 62, align: 'center' },
    lessons: [
      {
        id: 'inv1',
        title: '3-Month Winter Emergency Fund',
        duration: '3 min',
        reward: 45,
        completed: false,
        summary: 'Before chasing high-risk stocks, store 3 months of bare-bones essentials in a High-Interest Savings Account so emergencies never go on a 20% APR credit card.',
        challengeType: 'quiz',
        question: 'Where should your 3-Month Emergency Stash live?',
        options: [
          { text: 'A liquid High-Interest Savings Account (HISA)', correct: true },
          { text: 'Volatile meme coins', correct: false },
          { text: 'Locked in a 5-year non-redeemable bond', correct: false }
        ],
        explanation: 'Liquid and safe! Your emergency stash protects your investments from forced panic-selling.'
      }
    ]
  }
];
