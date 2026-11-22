// @ts-nocheck
import * as Icons from './Icons';
import { HardwareSquirrel } from './HardwareSquirrel';
const { Sparkles, Volume2, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Award, BookOpen, Sliders, TreePine, BarChart3, Bot, ChevronRight, X, Zap, Moon, Clock, Heart, Edit3, Check, RefreshCw, ArrowUpRight, Coins, GraduationCap, Landmark, Wallet } = Icons;

export function SkillTreeTab(props) {
  const { activeTab, branches, acorns, plantedAcorns, canopyGrowth, plantAcorn, demoMode, resetDemoData, handleSelectBranch, totalLessons, completedLessons, isUnderBudget, dailySpent, dailyLimit, handleToggleBudgetSimulation, petName, hardwareMood, isWagging, speechBubble, voiceProfile, playPetChime, triggerCelebration, selectedBranch, setSelectedBranch, activeLessonIndex, setActiveLessonIndex, selectedAnswer, setSelectedAnswer, sliderGuess, setSliderGuess, lessonFeedback, setLessonFeedback, toastMessage, showToast, vibeTagged, regretVoted, handleVibeCheck, handleRegretPulse, setBranches, setHardwareMood, setIsWagging, setSpeechBubble, isEditingName, setIsEditingName, tempName, setTempName, setPetName, setVoiceProfile } = props;
  const treeScale = Math.min(plantedAcorns / 4, 1);
  return (
    <>
          {activeTab === 'tree' && (
            <div className="flex flex-col h-full">
              {/* Helper Instruction Pill */}
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#5C4033] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  Tap a branch to learn and collect acorns
                </span>
                <span className="text-[11px] font-bold text-[#2D6A4F]">
                  {Math.min(100, Math.round((plantedAcorns / 4) * 100))}% Tree grown
                </span>
              </div>

              {/* ILLUSTRATED INTERACTIVE SVG SKILL TREE */}
              <div className="relative w-full px-2 pt-1 pb-2 flex-1 flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[420px] aspect-[370/415] rounded-3xl bg-gradient-to-b from-[#F2E7CF] via-[#F5EFDF] to-[#D3B28A] border border-[#E2D7C1] shadow-inner overflow-hidden">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#D8F3DC] via-[#F4F8E8] to-[#A8C889] transition-opacity duration-700" style={{ opacity: treeScale }} />
                  <svg
                    viewBox="0 0 370 415"
                    className="relative z-10 w-full h-full select-none"
                    role="img"
                    aria-label="Interactive Financial Planning Skill Tree"
                  >
                    <defs>
                      <radialGradient id="sunGlow" cx="50%" cy="22%" r="55%">
                        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#FAF6EE" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4A3222" />
                        <stop offset="45%" stopColor="#6F4E37" />
                        <stop offset="100%" stopColor="#3E2723" />
                      </linearGradient>
                      <linearGradient id="canopyBack" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#40916C" />
                        <stop offset="100%" stopColor="#1B4332" />
                      </linearGradient>
                      <linearGradient id="canopyFront" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#74C69D" />
                        <stop offset="100%" stopColor="#2D6A4F" />
                      </linearGradient>
                    </defs>

                    {/* Warm Morning Sunlight Halo */}
                    <circle cx="185" cy="145" r="165" fill="url(#sunGlow)" />

                    {/* Subtle Floating Fireflies / Pollen */}
                    <circle cx="65" cy="95" r="2.5" fill="#F59E0B" opacity="0.5" />
                    <circle cx="310" cy="115" r="3" fill="#F59E0B" opacity="0.45" />
                    <circle cx="295" cy="255" r="2" fill="#2D6A4F" opacity="0.4" />
                    <circle cx="52" cy="245" r="2.5" fill="#D97706" opacity="0.4" />

                    {/* Rich Soil & Mossy Hill */}
                    <path
                      d="M0 375 Q185 342 370 375 L370 415 L0 415 Z"
                      fill="#5C4033"
                    />
                    <path
                      d="M0 378 Q185 347 370 378 L370 390 Q185 360 0 390 Z"
                      fill="#40916C"
                    />

                    {treeScale > 0 ? <g transform={`translate(185 375) scale(${treeScale}) translate(-185 -375)`}>
                    {/* The tree reaches full size after four planted acorns. */}
                    <g opacity="0.92">
                      <circle cx="185" cy="132" r={58 + canopyGrowth * 1.6} fill="url(#canopyBack)" />
                      <circle cx="115" cy="182" r={48 + canopyGrowth * 1.2} fill="url(#canopyBack)" />
                      <circle cx="255" cy="178" r={50 + canopyGrowth * 1.2} fill="url(#canopyBack)" />
                      <circle cx="145" cy="112" r="46" fill="#2D6A4F" />
                      <circle cx="228" cy="112" r="48" fill="#2D6A4F" />
                    </g>

                    {/* Front Highlight Canopy Puffs */}
                    <g opacity="0.88">
                      <circle cx="185" cy="108" r="48" fill="url(#canopyFront)" />
                      <circle cx="102" cy="195" r="40" fill="url(#canopyFront)" />
                      <circle cx="268" cy="190" r="42" fill="url(#canopyFront)" />
                      <circle cx="145" cy="158" r="44" fill="#52B788" opacity="0.55" />
                      <circle cx="224" cy="154" r="42" fill="#52B788" opacity="0.55" />
                    </g>

                    {/* Main Oak Trunk & Spreading Branches */}
                    <path
                      d="M156 376 C164 330, 168 275, 170 225 C148 214, 125 208, 102 198 C126 196, 150 202, 172 210 C174 172, 178 135, 186 98 C192 135, 195 168, 197 198 C222 192, 245 186, 272 182 C246 196, 222 204, 197 212 C198 265, 204 328, 216 376 Z"
                      fill="url(#trunkGrad)"
                    />

                    {/* Root Flare Details */}
                    <path
                      d="M164 365 C142 374, 124 380, 108 384 M206 365 C228 374, 248 380, 264 384 M185 352 L185 382"
                      stroke="#3E2723"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Trunk Hollow (Cozy Squirrel Home!) */}
                    <ellipse
                      cx="184"
                      cy="274"
                      rx="11"
                      ry="15"
                      fill="#2B1B12"
                      stroke="#8D6E63"
                      strokeWidth="2"
                    />

                    {/* Acorns planted in the tree appear along its branches. */}
                    {[[86, 228], [292, 218], [144, 82], [245, 125], [105, 145], [263, 165], [178, 65], [73, 180], [224, 215], [164, 203], [126, 104], [278, 102]]
                      .slice(0, Math.min(plantedAcorns, 12))
                      .map(([x, y], index) => <g className="float-slow" key={`${x}-${y}`}>
                        <ellipse cx={x} cy={y} rx="5" ry="6.5" fill={index % 2 ? '#F59E0B' : '#FBBF24'} />
                        <path d={`M${x - 5} ${y - 3} Q${x} ${y - 7} ${x + 5} ${y - 3} Z`} fill="#78350F" />
                      </g>)}
                    </g> : <g aria-label="Seed stage">
                      <ellipse cx="185" cy="358" rx="11" ry="9" fill="#A16207" />
                      <path d="M174 357 Q185 346 196 357 Q186 354 174 357Z" fill="#FBBF24" />
                      <path d="M184 349 Q184 344 188 342" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                    </g>}

                    {/* INTERACTIVE CLICKABLE BRANCH NODES */}
                    {branches.map((branch) => {
                      const doneCount = branch.lessons.filter((l) => l.completed).length;
                      const totalCount = branch.lessons.length;
                      const isAllDone = doneCount === totalCount;

                      return (
                        <g
                          key={branch.id}
                          onClick={() => handleSelectBranch(branch)}
                          className="cursor-pointer group"
                        >
                          {/* Glowing Pulse Ring */}
                          {branch.unlocked && (
                            <circle
                              cx={branch.coords.x}
                              cy={branch.coords.y}
                              r="24"
                              fill={isAllDone ? '#34D399' : '#FBBF24'}
                              className="node-pulse"
                            />
                          )}

                          {/* Outer Node Medallion */}
                          <circle
                            cx={branch.coords.x}
                            cy={branch.coords.y}
                            r="20"
                            fill={branch.unlocked ? '#FFFBEB' : '#E7E5E4'}
                            stroke={
                              !branch.unlocked
                                ? '#A8A29E'
                                : isAllDone
                                ? '#10B981'
                                : '#D97706'
                            }
                            strokeWidth="3.5"
                          />

                          {/* Acorn / Icon Inside Node */}
                          <text
                            x={branch.coords.x}
                            y={branch.coords.y + 5}
                            textAnchor="middle"
                            fontSize="16"
                          >
                            {!branch.unlocked
                              ? '🔒'
                              : branch.id === 'budgeting'
                              ? '🌰'
                              : branch.id === 'tuition'
                              ? '🎓'
                              : branch.id === 'tfsa'
                              ? '📈'
                              : '🛡️'}
                          </text>

                          {/* Floating Pill Label Card */}
                          <g
                            transform={`translate(${
                              branch.labelPos.align === 'center'
                                ? branch.labelPos.x - 68
                                : branch.labelPos.align === 'right'
                                ? branch.labelPos.x - 24
                                : branch.labelPos.x - 36
                            }, ${branch.labelPos.y - 18})`}
                          >
                            <rect
                              x="0"
                              y="0"
                              width="136"
                              height="36"
                              rx="11"
                              fill="#FFFFFF"
                              fillOpacity="0.95"
                              stroke={branch.unlocked ? '#D6CFC2' : '#D6D3D1'}
                              strokeWidth="1.5"
                            />
                            <text
                              x="10"
                              y="15"
                              fontSize="10.5"
                              fontWeight="800"
                              fill="#1B4332"
                            >
                              {branch.title.length > 19
                                ? branch.title.slice(0, 18) + '…'
                                : branch.title}
                            </text>
                            <text
                              x="10"
                              y="28"
                              fontSize="9.5"
                              fontWeight="700"
                              fill={
                                !branch.unlocked
                                  ? '#78716C'
                                  : isAllDone
                                  ? '#059669'
                                  : '#B45309'
                              }
                            >
                              {!branch.unlocked
                                ? `Unlock: ${branch.unlockCost} 🌰`
                                : `${doneCount}/${totalCount} Mastered • Tap`}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-2 flex w-full max-w-[420px] items-center justify-between gap-3 rounded-2xl border border-[#D8CFBA] bg-white/90 px-4 py-3 shadow-sm">
                  <div>
                    <strong className="block text-sm text-[#1B4332]">Plant an acorn</strong>
                    <span className="text-xs text-[#6B5E51]">{acorns} ready, {plantedAcorns} planted</span>
                  </div>
                  <button type="button" disabled={acorns < 1} onClick={plantAcorn} className="rounded-xl bg-[#2D6A4F] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    Plant acorn
                  </button>
                </div>
              {demoMode && (
                <div className="mt-2 w-full max-w-[420px] text-right">
                  <button type="button" onClick={resetDemoData} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6B5E51] underline decoration-[#B8AA98] underline-offset-2 hover:text-[#1B4332]">
                    Reset learning tree
                  </button>
                </div>
              )}
              </div>

              {/* 3. DOCKED HARDWARE SQUIRREL COMPANION & BEHAVIORAL SPEECH BUBBLE */}
              <div className="px-4 pb-3">
                <div className="bg-white/95 border border-[#E2D7C1] rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <div className="shrink-0">
                    <HardwareSquirrel
                      mood={hardwareMood}
                      wagging={isWagging}
                      size="md"
                      onClick={() =>
                        triggerCelebration(
                          petName ? `Chirp! ${petName} is cheering you on! Tap a tree branch or check your daily report.` : 'Your companion is cheering you on. Set up a name in Profile.',
                          'happy'
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#92400E] flex items-center gap-1">
                        <span>🐾 {petName || 'Your companion'}</span>
                        <span className="text-[10px] font-medium text-[#78716C]">
                          • {hardwareMood === 'happy' ? 'Happy Dance' : hardwareMood === 'worried' ? 'Worried Eyes' : 'NFC Active'}
                        </span>
                      </span>
                      <button
                        onClick={() => playPetChime(voiceProfile)}
                        className="text-[#2D6A4F] hover:bg-[#ECFDF5] p-1 rounded-full transition"
                        title="Play Hardware Voice Chirp"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#292524] leading-snug font-medium">
                      “{speechBubble}”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: DAILY & BI-WEEKLY REPORTS + BEHAVIORAL RADAR       */}
          {/* ========================================================= */}

    </>
  );
}
