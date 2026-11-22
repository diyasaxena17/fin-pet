// @ts-nocheck
import * as Icons from './Icons';
import { HardwareSquirrel } from './HardwareSquirrel';
import { DailyBudgetCard } from './DailyBudgetCard';
const { Sparkles, Volume2, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Award, BookOpen, Sliders, TreePine, BarChart3, Bot, ChevronRight, X, Zap, Moon, Clock, Heart, Edit3, Check, RefreshCw, ArrowUpRight, Coins, GraduationCap, Landmark, Wallet } = Icons;

export function ReportsTab(props) {
  const { activeTab, branches, goldenNuts, handleSelectBranch, totalLessons, completedLessons, isUnderBudget, dailySpent, dailyLimit, petName, hardwareMood, isWagging, speechBubble, voiceProfile, playPetChime, triggerCelebration, selectedBranch, setSelectedBranch, activeLessonIndex, setActiveLessonIndex, selectedAnswer, setSelectedAnswer, sliderGuess, setSliderGuess, lessonFeedback, setLessonFeedback, toastMessage, showToast, vibeTagged, regretVoted, handleVibeCheck, handleRegretPulse, setBranches, setHardwareMood, setIsWagging, setSpeechBubble, isEditingName, setIsEditingName, tempName, setTempName, setPetName, setVoiceProfile } = props;
  return (
    <>
          {activeTab === 'reports' && (
            <div className="p-4 space-y-4">
              {/* Daily Budget & Hardware Eye State Card (live, entered by the user) */}
              <DailyBudgetCard {...props} />

              {/* Bi-Weekly Investing & Savings Goal Reports */}
              <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#1B4332] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#2D6A4F]" />
                    Bi-Weekly Stash Reports
                  </h3>
                  <span className="text-[11px] font-semibold text-[#6B5E51]">
                    Pay Period 11
                  </span>
                </div>

                {/* Bi-Weekly Investing Goal */}
                <div className="p-3 rounded-xl bg-[#F4F9F5] border border-[#D1E7DD]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-extrabold text-[#1B4332]">
                      📈 TFSA Index ETF Auto-Stash
                    </span>
                    <span className="text-xs font-extrabold text-[#2D6A4F]">
                      $150 / $150
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#D1E7DD] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-[#2D6A4F] rounded-full w-full" />
                  </div>
                  <p className="text-[11px] text-[#374151]">
                    Completed 4 hours after payday! Zero payday-to-splurge leakage detected.
                  </p>
                </div>

                {/* Bi-Weekly Savings Goal */}
                <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-extrabold text-[#92400E]">
                      🎓 Winter Tuition & Emergency Fund
                    </span>
                    <span className="text-xs font-extrabold text-[#B45309]">
                      $180 / $200
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#FDE68A] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-[#D97706] rounded-full w-[90%]" />
                  </div>
                  <p className="text-[11px] text-[#57534E]">
                    $20 remaining before Friday—resisting 1 takeout meal finishes this cycle!
                  </p>
                </div>
              </div>

              {/* 3-Layer Behavioral Tracking Engine Insights */}
              <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-[#1B4332] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                  Behavioral Tracking Signals
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C4033] mb-1">
                      <Moon className="w-3.5 h-3.5 text-[#4338CA]" />
                      Late-Night Ratio
                    </div>
                    <div className="text-lg font-extrabold text-[#1B4332]">4%</div>
                    <div className="text-[10px] text-[#059669] font-semibold">
                      ↓ Down 18% this week
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C4033] mb-1">
                      <Zap className="w-3.5 h-3.5 text-[#D97706]" />
                      Impulse Resistance
                    </div>
                    <div className="text-lg font-extrabold text-[#1B4332]">86 / 100</div>
                    <div className="text-[10px] text-[#059669] font-semibold">
                      3 carts abandoned (+60 🌰)
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C4033] mb-1">
                      <Clock className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      Payday Latency
                    </div>
                    <div className="text-lg font-extrabold text-[#1B4332]">Healthy</div>
                    <div className="text-[10px] text-[#57534E]">
                      Savings moved before wants
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C4033] mb-1">
                      <RefreshCw className="w-3.5 h-3.5 text-[#B45309]" />
                      Velocity Clusters
                    </div>
                    <div className="text-lg font-extrabold text-[#1B4332]">0 Bursts</div>
                    <div className="text-[10px] text-[#059669] font-semibold">
                      No stress sprees in 6 days
                    </div>
                  </div>
                </div>

                {/* 48-Hr Regret Pulse Card */}
                <div className="p-3.5 rounded-xl bg-[#F8F5EE] border border-[#E2D7C1]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#92400E] mb-1">
                    48-Hour Regret Pulse
                  </div>
                  <p className="text-xs font-semibold text-[#1F2923] mb-2.5">
                    Two days ago you spent <span className="underline">$22.50 at Campus Bookstore</span>. Still glad you bought it?
                  </p>
                  {regretVoted ? (
                    <div className="text-xs font-bold text-[#2D6A4F] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Recorded in your personal Regret Profile (+20 🌰)
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegretPulse('worth_it')}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition"
                      >
                        👍 Worth It (+20 🌰)
                      </button>
                      <button
                        onClick={() => handleRegretPulse('regret')}
                        className="flex-1 py-2 px-3 rounded-xl bg-white border border-[#D6CFC2] text-[#5C4033] text-xs font-bold hover:bg-[#EFE6D5] transition"
                      >
                        👎 Buyer’s Remorse
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: HARDWARE PET CUSTOMIZATION & SERVO/EYE CONTROLS    */}
          {/* ========================================================= */}

    </>
  );
}
