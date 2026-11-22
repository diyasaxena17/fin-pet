// @ts-nocheck
import * as Icons from './Icons';
import { HardwareSquirrel } from './HardwareSquirrel';
const { Sparkles, Volume2, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Award, BookOpen, Sliders, TreePine, BarChart3, Bot, ChevronRight, X, Zap, Moon, Clock, Heart, Edit3, Check, RefreshCw, ArrowUpRight, Coins, GraduationCap, Landmark, Wallet } = Icons;

export function PetTab(props) {
  const { activeTab, branches, goldenNuts, handleSelectBranch, totalLessons, completedLessons, isUnderBudget, dailySpent, dailyLimit, handleToggleBudgetSimulation, petName, hardwareMood, isWagging, speechBubble, voiceProfile, playPetChime, triggerCelebration, selectedBranch, setSelectedBranch, activeLessonIndex, setActiveLessonIndex, selectedAnswer, setSelectedAnswer, sliderGuess, setSliderGuess, lessonFeedback, setLessonFeedback, toastMessage, showToast, vibeTagged, regretVoted, handleVibeCheck, handleRegretPulse, setBranches, setHardwareMood, setIsWagging, setSpeechBubble, isEditingName, setIsEditingName, tempName, setTempName, setPetName, setVoiceProfile } = props;
  return (
    <>
          {activeTab === 'pet' && (
            <div className="p-4 space-y-4">
              {/* Interactive Hardware Stage */}
              <div className="bg-gradient-to-b from-[#F3ECE0] to-white rounded-3xl p-5 border border-[#E2D7C1] flex flex-col items-center text-center shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#1B4332]/10 text-[#1B4332] mb-2">
                  Physical NFC Companion Sync
                </span>

                <HardwareSquirrel
                  mood={hardwareMood}
                  wagging={isWagging}
                  size="lg"
                  onClick={() =>
                    triggerCelebration(
                      `Hi! I'm ${petName}! Tap the buttons below to test my OLED eyes, tail servo & speaker.`,
                      'happy'
                    )
                  }
                />

                {/* Editable Pet Name */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempName}
                        maxLength={14}
                        onChange={(e) => setTempName(e.target.value)}
                        className="px-3 py-1 text-sm font-extrabold text-[#1B4332] bg-white border-2 border-[#2D6A4F] rounded-xl focus:outline-none w-36 text-center"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const cleaned = tempName.trim() || 'Pip';
                          setPetName(cleaned);
                          setIsEditingName(false);
                          triggerCelebration(`Yay! My name is ${cleaned} now!`, 'happy');
                        }}
                        className="p-1.5 rounded-xl bg-[#2D6A4F] text-white"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-extrabold text-[#1B4332]">{petName}</h2>
                      <button
                        onClick={() => {
                          setTempName(petName);
                          setIsEditingName(true);
                        }}
                        className="p-1.5 rounded-lg text-[#6B5E51] hover:bg-[#EFE6D5] transition"
                        title="Rename companion"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#6B5E51] mt-0.5">
                  Hardware ID: #SQ-NFC-04 • Battery 92%
                </p>
              </div>

              {/* Voice Personality Selector */}
              <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs">
                <h3 className="text-sm font-extrabold text-[#1B4332] mb-1">
                  Hardware Speaker Voice
                </h3>
                <p className="text-xs text-[#6B5E51] mb-3">
                  Choose how {petName} cheers when you stay under your daily budget.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cute', label: 'Cute Chirp', emoji: '🐿️' },
                    { id: 'warm', label: 'Warm Female', emoji: '✨' },
                    { id: 'calm', label: 'Calm Male', emoji: '🌲' }
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVoiceProfile(v.id);
                        playPetChime(v.id);
                        showToast(`Voice set to ${v.label}`);
                      }}
                      className={`p-3 rounded-xl border text-center transition ${
                        voiceProfile === v.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm'
                          : 'bg-[#FAF6EE] text-[#292524] border-[#E2D7C1] hover:bg-[#F3ECE0]'
                      }`}
                    >
                      <div className="text-lg mb-1">{v.emoji}</div>
                      <div className="text-xs font-bold">{v.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Eye & Servo Tail Test Triggers */}
              <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs space-y-2.5">
                <h3 className="text-sm font-extrabold text-[#1B4332]">
                  Test Hardware Eyes & Tail Servo
                </h3>

                <button
                  onClick={() =>
                    triggerCelebration(
                      `Under daily budget! Tail servo wagging at 100% excitement!`,
                      'happy'
                    )
                  }
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-extrabold flex items-center justify-between hover:bg-[#D1FAE5] transition"
                >
                  <span>😄 Under-Budget Celebration Dance + Tail Wag</span>
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setHardwareMood('alert');
                    setIsWagging(false);
                    setSpeechBubble(
                      `NFC tap detected! Ready to review your daily spending report?`
                    );
                    playPetChime(voiceProfile);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs font-extrabold flex items-center justify-between hover:bg-[#FEF3C7] transition"
                >
                  <span>👀 NFC Tap Check-In Eyes</span>
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setHardwareMood('worried');
                    setIsWagging(false);
                    setSpeechBubble(
                      `Over daily limit! Let's pause non-essential spending for tonight.`
                    );
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-extrabold flex items-center justify-between hover:bg-[#FEE2E2] transition"
                >
                  <span>😟 Over-Limit Worried Eyes</span>
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
    </>
  );
}
