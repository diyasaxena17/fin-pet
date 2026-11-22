import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { SquirrelAvatar } from '../components/SquirrelAvatar';
import { useAppState } from '../lib/appState';

type Topic = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  lesson: string;
  takeaway: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source?: { label: string; href: string };
};

const topics: Topic[] = [
  {
    id: 'investing', name: 'Investing basics', subtitle: 'Start with risk, time and fees', icon: '📈',
    lesson: 'Investing means putting money into assets that may increase or decrease in value. Before choosing, learn how risk, fees, your time horizon, and spreading money across different investments can matter.',
    takeaway: 'There are no guaranteed returns. You can lose some or all of the money you invest.',
    question: 'Which statement about investing is true?',
    options: ['Investments can lose value', 'Returns are guaranteed over time'], answer: 0,
    explanation: 'All investments involve some risk. Learn how a product works and what it costs before making a decision.',
    source: { label: 'Canadian Securities Administrators: investing basics', href: 'https://www.securities-administrators.ca/investor-tools/investing-basics/' },
  },
  {
    id: 'budget', name: 'Budgeting', subtitle: 'Give your money a gentle plan', icon: '🧾',
    lesson: 'A budget is a way to see what comes in, what goes out, and what you want to set aside. Include regular bills, flexible spending, and expenses that only show up once in a while.',
    takeaway: 'Try adding tuition, gifts, or repairs as periodic costs so they are not surprises.',
    question: 'Tuition is due in six months. Which kind of expense is it?',
    options: ['A periodic expense to plan for over time', 'A daily fixed bill'], answer: 0,
    explanation: 'Known costs that do not happen every month can be split across the months before they are due.',
    source: { label: 'Financial Consumer Agency of Canada: budgeting', href: 'https://www.canada.ca/en/financial-consumer-agency/services/financial-basics/financial-basics-videos/financial-basics-video-budgeting.html' },
  },
  {
    id: 'tfsa', name: 'TFSAs', subtitle: 'Understand the account basics', icon: '🌱',
    lesson: 'A Tax-Free Savings Account (TFSA) is an account type. It can hold eligible savings or investments, and the rules for contributions and withdrawals matter.',
    takeaway: 'A withdrawal generally adds contribution room back on January 1 of the next calendar year. Check your records and available room before contributing.',
    question: 'You withdraw money from a TFSA this year. When is that room generally added back?',
    options: ['Right away', 'January 1 of next year'], answer: 1,
    explanation: 'The CRA says TFSA withdrawals generally create new contribution room in the next calendar year. Your exact room is personal, so verify it before contributing.',
    source: { label: 'Canada Revenue Agency: TFSA withdrawals', href: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/withdraw.html' },
  },
  {
    id: 'tuition', name: 'Tuition', subtitle: 'Make a school-cost plan', icon: '🎓',
    lesson: 'Start with the due date and the amount you expect to need. Then compare it with what you have already set aside and the number of months left.',
    takeaway: 'A simple monthly target is the remaining amount divided by the months before it is due. It is a planning prompt, not a promise that the target will fit every budget.',
    question: 'You want to plan for a known school cost. What is a useful first step?',
    options: ['Wait until it is due', 'Write down the amount and due date'], answer: 1,
    explanation: 'Knowing the amount and timing makes it easier to decide what is manageable month by month.',
    source: { label: 'FCAC: include tuition as a periodic expense', href: 'https://www.canada.ca/en/financial-consumer-agency/services/financial-basics/financial-basics-videos/financial-basics-video-budgeting.html' },
  },
  {
    id: 'safety-net', name: 'Safety net', subtitle: 'Prepare for the unexpected', icon: '☂️',
    lesson: 'An emergency fund is money kept for unexpected costs or a change in income. A first step can be choosing a small, realistic amount to set aside regularly.',
    takeaway: 'Your starting point can be modest and adjusted as your circumstances change.',
    question: 'Which is a useful first move for an emergency fund?',
    options: ['Choose a manageable amount and repeat it', 'Assume every month will be identical'], answer: 0,
    explanation: 'A repeatable plan can be adapted over time; there is no one amount that fits everyone.',
  },
];

export function TopicForest() {
  const { state } = useAppState();
  const [params] = useSearchParams();
  const linkedTopic = params.get('topic');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const lessonHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { lessonHeading.current?.focus(); }, [activeTopic]);
  useEffect(() => {
    const topic = topics.find(candidate => candidate.id === linkedTopic);
    if (topic) openTopic(topic);
  }, [linkedTopic]);

  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  const scannedPetId = params.get('petId');
  if (scannedPetId && scannedPetId !== state.pet.id) {
    return <PageShell eyebrow="NFC FOREST GUIDE" title="This branch is for another companion"><p>We couldn’t match this tag to your squirrel.</p><Link className="text-link" to="/">Go to your Forest</Link></PageShell>;
  }

  function openTopic(topic: Topic) {
    setActiveTopic(topic);
    setChoice(null);
    setChecked(false);
  }

  return <div className="page-stack">
    <PageShell eyebrow="YOUR NFC FOREST GUIDE" title={`Welcome to the forest, ${state.pet.name}`}>
      <div className="topic-intro">
        <SquirrelAvatar name={state.pet.name} mood={state.pet.mood} level={state.wallet.level} />
        <div><p className="topic-intro-title">Pick a branch. Learn at your own pace.</p><p className="supporting-copy">Small, practical money topics are here when you want them. Nothing to catch up on.</p></div>
      </div>
      <div className="topic-tree-scene" aria-hidden="true">
        <svg viewBox="0 0 800 210" role="img" focusable="false">
          <path className="topic-trunk" d="M401 215 C396 170 404 126 400 75 C398 48 392 28 390 5 M401 113 C356 96 328 65 302 34 M401 140 C455 115 486 76 513 35 M399 88 C370 71 355 48 345 18 M403 75 C435 55 452 33 460 8" />
          <path className="topic-root" d="M402 190 C370 202 345 202 322 210 M402 190 C431 202 458 202 482 210" />
          <circle className="topic-canopy" cx="400" cy="56" r="34" /><circle className="topic-canopy topic-canopy--small" cx="342" cy="38" r="26" /><circle className="topic-canopy topic-canopy--small" cx="460" cy="38" r="28" />
        </svg>
        <span className="topic-tree-caption">Curiosity grows here</span>
      </div>
      <h2 className="topic-choose-heading">Choose a branch to explore</h2>
      <div className="topic-branch-grid" aria-label="Financial planning topics">
        {topics.map((topic, index) => <button
          key={topic.id}
          type="button"
          className={`topic-branch topic-branch--${index + 1}`}
          onClick={() => openTopic(topic)}
          aria-expanded={activeTopic?.id === topic.id}
        ><span className="topic-icon" aria-hidden="true">{topic.icon}</span><span className="topic-branch-copy"><strong>{topic.name}</strong><small>{topic.subtitle}</small></span><span className="topic-arrow" aria-hidden="true">↗</span></button>)}
      </div>
      <p className="topic-privacy-note">Practice only: these mini lessons don’t change your budget, savings, or account settings.</p>
      <div className="action-row"><Link className="button" to="/">Visit my Forest</Link><Link className="text-link" to="/report">Open today’s report</Link></div>
    </PageShell>

    {activeTopic && <section className="topic-lesson page-card rounded-3xl border bg-white p-5 shadow-sm sm:p-7" aria-labelledby="topic-lesson-title" aria-live="polite">
      <div className="topic-lesson-header"><div><p className="eyebrow">A SHORT FOREST GUIDE</p><h2 id="topic-lesson-title" ref={lessonHeading} tabIndex={-1}>{activeTopic.icon} {activeTopic.name}</h2></div><button className="button--quiet" type="button" onClick={() => setActiveTopic(null)} aria-label="Close topic">Close</button></div>
      <p>{activeTopic.lesson}</p><p className="topic-takeaway"><strong>A small thing to remember</strong><br />{activeTopic.takeaway}</p>
      <fieldset className="choice-fieldset topic-question">
        <legend>{activeTopic.question}</legend>
        {activeTopic.options.map((option, index) => <label className="choice-row" key={option}><input type="radio" name={`topic-${activeTopic.id}`} checked={choice === index} onChange={() => { setChoice(index); setChecked(false); }} /><span>{option}</span></label>)}
      </fieldset>
      {checked && choice !== null && <p className={`topic-answer ${choice === activeTopic.answer ? 'topic-answer--right' : 'topic-answer--try-again'}`} role="status"><strong>{choice === activeTopic.answer ? 'That’s it!' : 'Good try.'}</strong> {activeTopic.explanation}</p>}
      <div className="action-row"><button type="button" disabled={choice === null} onClick={() => setChecked(true)}>Check my answer</button>{activeTopic.source && <a className="text-link" href={activeTopic.source.href} target="_blank" rel="noreferrer">Read the official guide ↗</a>}</div>
      <p className="topic-disclaimer">This is general learning, not personalized financial, tax, or investment advice.</p>
    </section>}
  </div>;
}
