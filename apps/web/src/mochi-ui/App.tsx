// @ts-nocheck
import React, { useEffect, useState } from 'react';
import * as Icons from './Icons';
import { INITIAL_BRANCHES } from './data';
import { HardwareSquirrel } from './HardwareSquirrel';
import { playPetChime } from './playPetChime';
import { SkillTreeTab } from './SkillTreeTab';
import { ReportsTab } from './ReportsTab';
import { PetTab } from './PetTab';
import { LandingJourneys } from './LandingJourneys';
import { useLocation, useNavigate } from 'react-router-dom';
import { WinterOak } from '../pages/WinterOak';
const { Sparkles, Volume2, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Award, BookOpen, Sliders, TreePine, BarChart3, Bot, ChevronRight, X, Zap, Moon, Clock, Heart, Edit3, Check, RefreshCw, ArrowUpRight, Coins, GraduationCap, Landmark, Wallet } = Icons;

// --- MAIN APPLICATION ---
export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const showWinterOak = location.pathname === '/oak';
  const demoMode = import.meta.env.DEV;
  // Navigation & UI Modals
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'reports' | 'pet'
  const [showNfcReportModal, setShowNfcReportModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  // User & Hardware Companion State
  const [petName, setPetName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [voiceProfile, setVoiceProfile] = useState('cute'); // 'cute' | 'warm' | 'calm'
  const [hardwareMood, setHardwareMood] = useState('happy'); // 'happy' | 'alert' | 'worried'
  const [isWagging, setIsWagging] = useState(true);
  const [speechBubble, setSpeechBubble] = useState(
    'Your companion is ready for a check-in.'
  );

  // Gamification & Behavioral Finance State
  const [acorns, setAcorns] = useState(() => {
    try {
      const saved = window.localStorage.getItem('mochi.tree.acorns.v1');
      return saved === null ? 385 : Math.max(0, Number(saved) || 0);
    }
    catch { return 385; }
  });
  const [acornsCollected, setAcornsCollected] = useState(() => {
    try { return Math.max(385, Number(window.localStorage.getItem('mochi.tree.acorns-collected.v1')) || 0); }
    catch { return 385; }
  });
  const [plantedAcorns, setPlantedAcorns] = useState(() => {
    try { return Math.max(0, Number(window.localStorage.getItem('mochi.tree.planted-acorns.v1')) || 0); }
    catch { return 0; }
  });
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [dailySpent, setDailySpent] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(45);
  const [vibeTagged, setVibeTagged] = useState(null); // null | 'planned' | 'hungry' | 'stressed' | 'treat'
  const [regretVoted, setRegretVoted] = useState(null); // null | 'worth_it' | 'regret'

  // Lesson Interaction State
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [sliderGuess, setSliderGuess] = useState(100);
  const [lessonFeedback, setLessonFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Trigger temporary celebration tail wag
  const triggerCelebration = (customSpeech, customMood = 'happy') => {
    setHardwareMood(customMood);
    setIsWagging(true);
    if (customSpeech) setSpeechBubble(customSpeech);
    playPetChime(voiceProfile);
    setTimeout(() => {
      setIsWagging(false);
    }, 2800);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Initial subtle stop of initial NFC wag
  useEffect(() => {
    const timer = setTimeout(() => setIsWagging(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('mochi.tree.acorns.v1', String(acorns));
      window.localStorage.setItem('mochi.tree.acorns-collected.v1', String(acornsCollected));
      window.localStorage.setItem('mochi.tree.planted-acorns.v1', String(plantedAcorns));
    } catch { /* keep acorn collection in this session */ }
  }, [acorns, acornsCollected, plantedAcorns]);

  // Acorns collected can unlock branches; planting spends one acorn and grows the canopy.
  const totalLessons = branches.reduce((acc, b) => acc + b.lessons.length, 0);
  const completedLessons = branches.reduce(
    (acc, b) => acc + b.lessons.filter((l) => l.completed).length,
    0
  );
  const canopyGrowth = Math.min(plantedAcorns, 4);
  const collectAcorns = (amount) => {
    setAcorns((current) => current + amount);
    setAcornsCollected((current) => current + amount);
  };
  const plantAcorn = () => {
    if (acorns < 1) return;
    setAcorns((current) => current - 1);
    setPlantedAcorns((current) => current + 1);
    showToast('Acorn planted! Your tree is growing.');
  };
  const resetDemoData = () => {
    if (!demoMode || !window.confirm('Reset the learning tree? This also removes saved goals, profile and logs, behavioural data, and other Mochi data on this device.')) return;
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('mochi.')) window.localStorage.removeItem(key);
      }
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith('forest-')) window.sessionStorage.removeItem(key);
      }
    } finally {
      window.location.assign('/');
    }
  };
  const isUnderBudget = dailySpent <= dailyLimit;

  // Handle Vibe Check-In (1-Tap Emotional Context)
  const handleVibeCheck = (vibeId, label) => {
    if (vibeTagged) return;
    setVibeTagged(vibeId);
    collectAcorns(15);
    triggerCelebration(`Thanks for tagging "${label}"! +15 acorns added to your collection.`, 'happy');
    showToast('+15 acorns collected for your tree!');
  };

  // Handle 48-Hr Regret Pulse
  const handleRegretPulse = (choice) => {
    if (regretVoted) return;
    setRegretVoted(choice);
    collectAcorns(20);
    const msg =
      choice === 'worth_it'
        ? 'Logged as Worth It! Your Regret Profile is getting sharper (+20 acorns).'
        : 'Noted! I’ll gently nudge you next time you browse that store late at night (+20 acorns).';
    triggerCelebration(msg, 'happy');
    showToast('+20 acorns collected!');
  };

  // Open Branch Drawer
  const handleSelectBranch = (branch) => {
    if (!branch.unlocked) {
      if (acornsCollected >= branch.unlockCost) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, unlocked: true } : b))
        );
        triggerCelebration(
          `Woohoo! New canopy branch "${branch.title}" sprouted on our tree!`,
          'happy'
        );
        showToast(`Unlocked ${branch.title}!`);
      } else {
        triggerCelebration(
          `Collect ${branch.unlockCost - acornsCollected} more acorns to grow the "${branch.title}" branch.`,
          'alert'
        );
        showToast(`Collect ${branch.unlockCost} acorns to unlock this branch`);
        return;
      }
    }
    const firstIncomplete = branch.lessons.findIndex((l) => !l.completed);
    const startIdx = firstIncomplete >= 0 ? firstIncomplete : 0;
    setSelectedBranch(branch);
    setActiveLessonIndex(startIdx);
    setSelectedAnswer(null);
    setLessonFeedback(null);
    const lesson = branch.lessons[startIdx];
    if (lesson.challengeType === 'slider') {
      setSliderGuess(lesson.min);
    }
  };

  // Complete Lesson Challenge
  const handleCompleteChallenge = (lesson) => {
    let isCorrect = false;
    if (lesson.challengeType === 'slider') {
      isCorrect = Math.abs(sliderGuess - lesson.targetValue) <= lesson.step;
    } else {
      isCorrect = selectedAnswer !== null && lesson.options[selectedAnswer]?.correct;
    }

    if (!isCorrect) {
      setLessonFeedback({
        success: false,
        text: 'Almost! Give it another try—check the hint in the summary above.'
      });
      setHardwareMood('alert');
      return;
    }

    setLessonFeedback({
      success: true,
      text: lesson.explanation
    });

    if (!lesson.completed) {
      collectAcorns(lesson.reward);
      setBranches((prev) =>
        prev.map((b) =>
          b.id === selectedBranch.id
            ? {
                ...b,
                lessons: b.lessons.map((l) =>
                  l.id === lesson.id ? { ...l, completed: true } : l
                )
              }
            : b
        )
      );
      setSelectedBranch((prev) => ({
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lesson.id ? { ...l, completed: true } : l
        )
      }));
      triggerCelebration(
        `Lesson mastered! +${lesson.reward} acorns collected. Plant one to grow your oak!`,
        'happy'
      );
      showToast(`+${lesson.reward} acorns collected!`);
    } else {
      triggerCelebration('Great refresher! Practice keeps our winter stash strong.', 'happy');
    }
  };

  // Simulate Budget State Preview (Under vs Over Limit)
  const handleToggleBudgetSimulation = () => {
    if (dailySpent <= dailyLimit) {
      setDailySpent(54);
      setHardwareMood('worried');
      setIsWagging(false);
      setSpeechBubble(
        `Uh oh! $54 spent today ($9 over your $45 daily cap). Want to freeze late-night checkout apps?`
      );
    } else {
      setDailySpent(32);
      triggerCelebration(
        `Back under budget ($32 / $45)! Doing my happy tail-wag dance!`,
        'happy'
      );
    }
  };

  const uiProps = { activeTab, setActiveTab, branches, acorns, acornsCollected, plantedAcorns, canopyGrowth, plantAcorn, demoMode, resetDemoData, handleSelectBranch, totalLessons, completedLessons, isUnderBudget, dailySpent, setDailySpent, dailyLimit, setDailyLimit, handleToggleBudgetSimulation, petName, hardwareMood, isWagging, speechBubble, voiceProfile, playPetChime, triggerCelebration, selectedBranch, setSelectedBranch, activeLessonIndex, setActiveLessonIndex, selectedAnswer, setSelectedAnswer, sliderGuess, setSliderGuess, lessonFeedback, setLessonFeedback, toastMessage, showToast, vibeTagged, regretVoted, handleVibeCheck, handleRegretPulse, setBranches, setHardwareMood, setIsWagging, setSpeechBubble, isEditingName, setIsEditingName, tempName, setTempName, setPetName, setVoiceProfile };

  return (
    <div className="min-h-screen w-full bg-[#EAE3D2] flex justify-center items-start sm:py-6 font-sans text-[#1F2923] antialiased selection:bg-[#F59E0B]/30">
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes tailWagFast {
          0% { transform: rotate(-14deg); }
          100% { transform: rotate(18deg); }
        }
        @keyframes tailBreathe {
          0% { transform: rotate(-3deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes acornBounce {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-3px); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.92); opacity: 0.75; }
          70% { transform: scale(1.28); opacity: 0; }
          100% { transform: scale(1.28); opacity: 0; }
        }
        .node-pulse {
          animation: pulseRing 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }
        .float-slow {
          animation: floatGlow 3.6s ease-in-out infinite;
        }
      `}</style>

      {/* MOBILE APP SHELL (max-w-[480px] centered on desktop, full-bleed on mobile) */}
      <div className="relative w-full max-w-[480px] min-h-screen sm:min-h-[850px] sm:max-h-[900px] bg-[#FAF6EE] sm:rounded-[38px] sm:shadow-[0_24px_60px_-15px_rgba(27,67,50,0.28)] sm:border-[6px] sm:border-[#2C241E] flex flex-col overflow-hidden">

        {/* FLOATING TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1B4332] text-[#FAF6EE] px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap border border-[#52B788]/40 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. NFC SYNC & COMPANION HEADER */}
        <header className="px-4 pt-4 pb-3 bg-gradient-to-b from-[#F3ECE0] to-[#FAF6EE] border-b border-[#E6DEC8] z-20">
          <div className="flex items-center justify-end gap-2 mb-2.5">
            {/* NFC Connected badge omitted as requested. */}

            {/* Quick report and collected acorns */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNfcReportModal(true)}
                className="text-[11px] font-semibold text-[#5C4033] bg-[#EFE6D5] hover:bg-[#E5D9C3] px-2.5 py-1 rounded-full transition"
              >
                Daily Pulse
              </button>
              <div aria-label={`${acorns} acorns ready to plant`} className="flex items-center gap-1 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B]/40 px-2.5 py-1 rounded-full shadow-xs">
                <span className="text-sm leading-none">🌰</span>
                <span className="text-xs font-extrabold text-[#92400E] tabular-nums">
                  {acorns}
                </span>
              </div>
            </div>
          </div>

          {/* Status Strip: Tree Stage + Daily Budget Pill */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 flex items-center justify-center text-[#1B4332] font-bold text-xs" aria-label={`${plantedAcorns} acorns planted`}>
                <TreePine className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-[#1B4332] leading-tight">
                  {petName ? `${petName}’s` : 'Your'} Winter Oak
                </h1>
                <p className="text-[11px] text-[#6B5E51]">
                  {plantedAcorns} acorns planted Â· {completedLessons}/{totalLessons} skills grown
                </p>
              </div>
            </div>

            {/* Interactive Daily Budget Pill */}
            <button
              onClick={handleToggleBudgetSimulation}
              title="Tap to preview Under-Budget vs Over-Budget hardware reaction"
              className={`px-3 py-1.5 rounded-xl border text-right transition active:scale-95 ${
                isUnderBudget
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Daily Cap
              </div>
              <div className="text-xs font-extrabold tabular-nums">
                ${dailySpent} / ${dailyLimit}{' '}
                <span className="ml-0.5">{isUnderBudget ? '✓' : '!'}</span>
              </div>
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto pb-24 relative">
          {/* ========================================================= */}
          {/* TAB 1: INTERACTIVE FINANCIAL SKILL TREE (LANDING VIEW)    */}
          {/* ========================================================= */}
          {showWinterOak ? <WinterOak embedded /> : <>
            <SkillTreeTab {...uiProps} />
            {activeTab === 'tree' && <LandingJourneys />}
            <ReportsTab {...uiProps} />
            <PetTab {...uiProps} />
          </>}

        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E6DEC8] px-4 py-2 flex items-center justify-around z-30">
          <button
            onClick={() => { setActiveTab('tree'); if (showWinterOak) navigate('/'); }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition ${
              activeTab === 'tree'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-[#6B5E51] hover:text-[#1B4332]'
            }`}
          >
            <TreePine className="w-5 h-5" />
            <span className="text-[11px] font-bold">Skill Tree</span>
          </button>

          <button
            onClick={() => { setActiveTab('reports'); if (showWinterOak) navigate('/'); }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition ${
              activeTab === 'reports'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-[#6B5E51] hover:text-[#1B4332]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[11px] font-bold">Reports</span>
          </button>

          <button
            onClick={() => { setActiveTab('pet'); if (showWinterOak) navigate('/'); }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition ${
              activeTab === 'pet'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-[#6B5E51] hover:text-[#1B4332]'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[11px] font-bold">Profile</span>
          </button>
        </nav>

        {/* ========================================================= */}
        {/* MODAL 1: NFC TAP WELCOME & DAILY REPORT + 1-TAP VIBE CHECK */}
        {/* ========================================================= */}
        {showNfcReportModal && (
          <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
            <div className="w-full bg-[#FAF6EE] rounded-3xl border-2 border-[#D6CFC2] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              {/* Top Hardware Banner */}
              <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 rounded-2xl p-1">
                    <HardwareSquirrel mood="happy" wagging={true} size="sm" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#A7F3D0]">
                      NFC Tap Activated
                    </div>
                    <h2 className="text-base font-extrabold leading-tight">
                      {petName ? `${petName}’s` : 'Your'} Daily Check-In!
                    </h2>
                    <p className="text-xs text-[#D1FAE5]">
                      Tail servo wagging • Under budget streak: 5 days
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNfcReportModal(false)}
                  aria-label="Close daily pulse"
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
                {/* Today's Achievements */}
                <div className="bg-white rounded-2xl p-3.5 border border-[#E6DEC8]">
                  <div className="text-xs font-extrabold text-[#1B4332] mb-2">
                    🏆 Today’s Good Habits Met
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#374151]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>
                        Stayed under daily budget (<strong>${dailySpent}</strong> of ${dailyLimit})
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>
                        <strong>0 late-night impulse buys</strong> between 11 PM – 3 AM
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Lightweight Active Context: 1-Tap Emoji Vibe Tagging */}
                <div className="bg-white rounded-2xl p-3.5 border border-[#E6DEC8]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#B45309]">
                      1-Tap Vibe Check (+15 🌰)
                    </span>
                    <span className="text-[11px] text-[#78716C]">2:15 PM</span>
                  </div>
                  <p className="text-xs font-semibold text-[#1F2923] mb-2.5">
                    You spent <strong>$6.40 at campus café</strong>. What fueled this?
                  </p>

                  {vibeTagged ? (
                    <div className="py-2 px-3 rounded-xl bg-[#ECFDF5] text-[#065F46] text-xs font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#059669]" />
                      <span>Tagged! +15 acorns added to {petName ? `${petName}’s` : 'your'} collection.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'planned', emoji: '🧠', label: 'Planned' },
                        { id: 'hungry', emoji: '🍔', label: 'Hungry' },
                        { id: 'stressed', emoji: '😩', label: 'Stressed' },
                        { id: 'treat', emoji: '🔥', label: 'Treat' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleVibeCheck(item.id, item.label)}
                          className="py-2 px-1 rounded-xl bg-[#FAF6EE] hover:bg-[#FEF3C7] border border-[#E2D7C1] flex flex-col items-center gap-1 transition active:scale-95"
                        >
                          <span className="text-lg leading-none">{item.emoji}</span>
                          <span className="text-[10px] font-bold text-[#44403C]">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bi-Weekly Snapshot */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                    <div className="text-[10px] font-bold text-[#065F46]">
                      Bi-Weekly Investing
                    </div>
                    <div className="font-extrabold text-[#1B4332]">
                      $150 / $150 TFSA ✓
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                    <div className="text-[10px] font-bold text-[#92400E]">
                      Bi-Weekly Savings
                    </div>
                    <div className="font-extrabold text-[#B45309]">
                      $180 / $200 Goal
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowNfcReportModal(false)}
                  className="w-full py-3 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <span>Explore {petName ? `${petName}’s` : 'your'} Skill Tree</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: INTERACTIVE BRANCH LEARNING & PRACTICE DRAWER    */}
        {/* ========================================================= */}
        {selectedBranch && (
          <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-xs flex items-end justify-center">
            <div className="w-full bg-[#FAF6EE] rounded-t-3xl border-t-2 border-[#D6CFC2] shadow-2xl p-4 max-h-[86vh] overflow-y-auto">
              {/* Branch Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E6DEC8]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#2D6A4F]/15 text-[#1B4332]">
                    {selectedBranch.pillar}
                  </span>
                  <h2 className="text-lg font-extrabold text-[#1B4332] mt-1">
                    {selectedBranch.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="p-1.5 rounded-full bg-[#EFE6D5] text-[#5C4033] hover:bg-[#E5D9C3]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lesson Selector Pills */}
              <div className="flex gap-2 my-3 overflow-x-auto pb-1">
                {selectedBranch.lessons.map((l, idx) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setActiveLessonIndex(idx);
                      setSelectedAnswer(null);
                      setLessonFeedback(null);
                      if (l.challengeType === 'slider') setSliderGuess(l.min);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 transition ${
                      activeLessonIndex === idx
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-white text-[#44403C] border-[#E2D7C1]'
                    }`}
                  >
                    {l.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                    )}
                    <span>Lesson {idx + 1}</span>
                  </button>
                ))}
              </div>

              {/* Active Lesson Content & Interactive Practice */}
              {(() => {
                const currentLesson = selectedBranch.lessons[activeLessonIndex];
                return (
                  <div className="space-y-3.5">
                    <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8]">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-extrabold text-[#1B4332]">
                          {currentLesson.title}
                        </h3>
                        <span className="text-xs font-extrabold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                          +{currentLesson.reward} 🌰
                        </span>
                      </div>
                      <p className="text-xs text-[#374151] leading-relaxed">
                        {currentLesson.summary}
                      </p>
                    </div>

                    {/* Practice Mini-Challenge */}
                    <div className="bg-[#F3ECE0] rounded-2xl p-4 border border-[#E2D7C1]">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#92400E] mb-1">
                        Interactive Practice Challenge
                      </div>
                      <p className="text-xs font-bold text-[#1F2923] mb-3">
                        {currentLesson.question}
                      </p>

                      {currentLesson.challengeType === 'slider' ? (
                        <div className="space-y-3">
                          <div className="text-center text-2xl font-extrabold text-[#1B4332] tabular-nums">
                            {currentLesson.unit}
                            {sliderGuess.toLocaleString()}
                          </div>
                          <input
                            type="range"
                            min={currentLesson.min}
                            max={currentLesson.max}
                            step={currentLesson.step}
                            value={sliderGuess}
                            onChange={(e) => {
                              setSliderGuess(Number(e.target.value));
                              setLessonFeedback(null);
                            }}
                            className="w-full accent-[#2D6A4F] cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-[#6B5E51]">
                            <span>
                              {currentLesson.unit}
                              {currentLesson.min.toLocaleString()}
                            </span>
                            <span>
                              {currentLesson.unit}
                              {currentLesson.max.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentLesson.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedAnswer(i);
                                setLessonFeedback(null);
                              }}
                              className={`w-full text-left p-3 rounded-xl text-xs font-semibold border transition ${
                                selectedAnswer === i
                                  ? 'bg-[#1B4332] text-white border-[#1B4332]'
                                  : 'bg-white text-[#292524] border-[#D6CFC2] hover:bg-[#FAF6EE]'
                              }`}
                            >
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {lessonFeedback && (
                        <div
                          className={`mt-3 p-3 rounded-xl text-xs font-semibold ${
                            lessonFeedback.success
                              ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                              : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                          }`}
                        >
                          {lessonFeedback.text}
                        </div>
                      )}

                      <button
                        onClick={() => handleCompleteChallenge(currentLesson)}
                        className="mt-3.5 w-full py-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold text-xs shadow-sm transition active:scale-98"
                      >
                        {currentLesson.completed
                          ? 'Check Answer Again'
                          : `Submit & Collect +${currentLesson.reward} acorns`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
