import React, { useState, useEffect } from "react";
import { StudentKingdom, QuizBattleQuestionPublic, BattleCalculationResult, BattleLogEntry } from "@/types/astravyuh";
import {
  BATTLE_ASTRAS,
  startBattleSession,
  submitBattleSession,
  calculateKingdomDefenseReduction
} from "@/services/astravyuhService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Swords, Zap, Flame, Droplets, Trophy, CheckCircle2, XCircle, ArrowRight, Star } from "lucide-react";
import { BattleVFX } from "./BattleVFX";
import { BattleWarCanvas, CombatEvent } from "./BattleWarCanvas";
import { triggerConfetti } from "@/lib/confetti";
import { useToast } from "@/hooks/use-toast";

interface BattleArenaModalProps {
  defender: StudentKingdom | null;
  attacker: StudentKingdom;
  isOpen: boolean;
  onClose: () => void;
  onBattleFinished: () => void;
}

type BattleStage = "intro" | "quiz" | "resolving" | "result";

export const BattleArenaModal: React.FC<BattleArenaModalProps> = ({
  defender,
  attacker,
  isOpen,
  onClose,
  onBattleFinished
}) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<BattleStage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizBattleQuestionPublic[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [vfxElement, setVfxElement] = useState<"fire" | "water" | "lightning" | "clash" | null>(null);

  const [battleResult, setBattleResult] = useState<BattleCalculationResult | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry | null>(null);
  const [actualFlixAwarded, setActualFlixAwarded] = useState<number>(0);
  const [questionFeedback, setQuestionFeedback] = useState<{ questionId: string; isCorrect: boolean; correctAnswer: string }[]>([]);

  // Real-time Clash of Clans War Combat States
  const [destructionPercent, setDestructionPercent] = useState<number>(0);
  const [starsEarned, setStarsEarned] = useState<number>(0);
  const [activeCombatEvent, setActiveCombatEvent] = useState<CombatEvent | null>(null);

  // Initialize session on modal open
  useEffect(() => {
    if (isOpen && defender) {
      setStage("intro");
      setSessionId(null);
      setQuestions([]);
      setCurrentQIndex(0);
      setSelectedAnswers({});
      setBattleResult(null);
      setBattleLog(null);
      setQuestionFeedback([]);
      setVfxElement(null);
      setDestructionPercent(0);
      setStarsEarned(0);
      setActiveCombatEvent(null);
    }
  }, [isOpen, defender]);

  if (!defender) return null;

  const attackerAstra = attacker.equippedAstraId ? BATTLE_ASTRAS[attacker.equippedAstraId] : null;
  const defenderAstra = defender.equippedAstraId ? BATTLE_ASTRAS[defender.equippedAstraId] : null;

  const defenderStats = calculateKingdomDefenseReduction(
    defender.castleLevel,
    defender.wallLevel,
    defender.towerLevel,
    defender.equippedAstraId
  );

  // Start battle quiz with secure session
  const handleStartQuiz = () => {
    try {
      const { session, publicQuestions } = startBattleSession(defender.studentId);
      setSessionId(session.sessionId);
      setQuestions(publicQuestions);
      setStage("quiz");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Cannot Initiate Battle",
        description: e.message || "Battle eligibility check failed."
      });
      onClose();
    }
  };

  // Select option in quiz
  const handleSelectOption = (option: string) => {
    if (!questions[currentQIndex]) return;
    const qId = questions[currentQIndex].id;
    if (selectedAnswers[qId]) return; // already answered this question

    const nextAnswers = { ...selectedAnswers, [qId]: option };
    setSelectedAnswers(nextAnswers);

    // Calculate real-time siege assault progress
    const answeredNow = Object.keys(nextAnswers).length;
    const estPct = Math.min(100, Math.round((answeredNow / (questions.length || 5)) * 100));
    setDestructionPercent(estPct);

    let stars = 0;
    if (estPct >= 50) stars = 1;
    if (estPct >= 70) stars = 2;
    if (estPct >= 100) stars = 3;
    setStarsEarned(stars);

    const eventTypes: CombatEvent["type"][] = ["wall_breach", "citadel_hit", "astra_blast", "strike"];
    const eventTexts = [
      `💥 WALL BREACHED! +${Math.round(100 / (questions.length || 5))}% Destruction!`,
      `⚡ ${attackerAstra?.name || 'Astra Surge'} - Direct Citadel Hit!`,
      `🏹 Arcane Archers Struck Defense Tower!`,
      `🔥 Fire Mages Ignited Enemy Barracks!`,
      `👑 Town Hall Citadel Under Heavy Siege!`
    ];

    setActiveCombatEvent({
      id: "evt_" + Date.now(),
      type: eventTypes[currentQIndex % eventTypes.length],
      text: eventTexts[currentQIndex % eventTexts.length],
      damage: 20,
      isCrit: currentQIndex === (questions.length - 1)
    });
  };

  // Advance to next question or finalize battle
  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      resolveBattle();
    }
  };

  // Resolve battle calculations & triggers
  const resolveBattle = () => {
    if (!sessionId) return;
    setStage("resolving");

    // Choose VFX element
    if (attacker.equippedAstraId === "agni-astra") {
      setVfxElement("fire");
    } else if (attacker.equippedAstraId === "vajra-astra") {
      setVfxElement("lightning");
    } else if (defender.equippedAstraId === "varuna-astra") {
      setVfxElement("water");
    } else {
      setVfxElement("clash");
    }

    setTimeout(() => {
      try {
        const outcome = submitBattleSession(sessionId, selectedAnswers, defender);
        setBattleResult(outcome.result);
        setBattleLog(outcome.log);
        setActualFlixAwarded(outcome.actualFlixGranted);
        setQuestionFeedback(outcome.feedback);

        const finalPct = outcome.result.finalDamage;
        setDestructionPercent(finalPct);
        let finalStars = 0;
        if (finalPct >= 50) finalStars = 1;
        if (finalPct >= 70) finalStars = 2;
        if (finalPct >= 95) finalStars = 3;
        setStarsEarned(finalStars);

        setStage("result");

        if (outcome.result.isVictory) {
          triggerConfetti({ particleCount: 75 });
        }
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Battle Submission Error",
          description: e.message || "Could not resolve battle."
        });
        onClose();
      }
    }, 1800);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const currentQ = questions[currentQIndex];
  const currentChosenOption = currentQ ? selectedAnswers[currentQ.id] : null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[98vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto bg-slate-950 border-2 border-amber-500/50 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3 sm:p-6 rounded-3xl">
        
        {/* ─── STAGE 1: INTRO / VERSUS SCREEN ─── */}
        {stage === "intro" && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
            <DialogHeader className="text-center space-y-1">
              <Badge className="mx-auto bg-amber-500/10 text-amber-300 border-amber-500/30 text-[11px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1">
                WAR ARENA CHALLENGE
              </Badge>
              <DialogTitle className="text-xl sm:text-2xl font-bold font-display text-slate-100 tracking-tight">
                Citadel Siege Engagement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Answer 5 academic questions correctly to breach the enemy kingdom's defenses!
              </DialogDescription>
            </DialogHeader>

            {/* Matchup Comparison Grid */}
            <div className="grid grid-cols-1 min-[460px]:grid-cols-2 gap-3 sm:gap-4 relative pt-1 sm:pt-2">
              <div className="hidden min-[460px]:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 text-slate-950 font-black text-xs items-center justify-center shadow-xl border-2 border-slate-950">
                VS
              </div>

              {/* Attacker Box (You) */}
              <div className="p-3 sm:p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                    ⚔️
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                      Attacker (You)
                    </div>
                    <div className="text-sm font-bold text-slate-100 truncate">
                      {attacker.studentName}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trophies:</span>
                    <span className="font-mono text-amber-400 font-bold">🏆 {attacker.trophies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Equipped Astra:</span>
                    {attackerAstra ? (
                      <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                        {attackerAstra.icon} {attackerAstra.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">None</span>
                    )}
                  </div>
                  {attackerAstra && (
                    <div className="text-[10px] text-amber-400/90 font-mono">
                      Buff: {attackerAstra.shortBuff}
                    </div>
                  )}
                </div>
              </div>

              {/* Defender Box (Rival) */}
              <div className="p-3 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-sm">
                    🏰
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-blue-400 font-bold uppercase tracking-wider">
                      Defender (Rival)
                    </div>
                    <div className="text-sm font-bold text-slate-100 truncate">
                      {defender.studentName}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Defensive Barrier:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      -{defenderStats.totalDefenseReduction} DMG
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Wall / Tower / Castle:</span>
                    <span className="font-mono text-slate-200">
                      L{defender.wallLevel} / L{defender.towerLevel} / L{defender.castleLevel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Astra:</span>
                    {defenderAstra ? (
                      <span className="font-bold text-blue-300 text-[11px] flex items-center gap-1">
                        {defenderAstra.icon} {defenderAstra.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Battle Rules Note */}
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Victory Conditions:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Each correct answer delivers <strong className="text-slate-200">20 attack damage</strong> (up to 100 max).</li>
                <li>Equipped Astra applies its power (Agni +10, Vajra +15 on 5/5, Varuna -10 defense).</li>
                <li>Final damage of <strong className="text-amber-400 font-mono">60% or higher</strong> claims victory!</li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto text-slate-400">
                Retreat
              </Button>
              <Button
                onClick={handleStartQuiz}
                className="w-full sm:w-auto gap-2 font-bold font-display bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 px-6 shadow-lg shadow-amber-500/20"
              >
                <Swords className="w-4 h-4" />
                Initiate Siege (5 Questions)
              </Button>
            </div>
          </div>
        )}

        {/* ─── STAGE 2: LIVE WAR BATTLEFIELD & TACTICAL STRIKE INCANTATIONS ─── */}
        {stage === "quiz" && currentQ && (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            {/* Live Clash of Clans War Battlefield with real-time walls, troops, and arrows */}
            <BattleWarCanvas
              defender={defender}
              attacker={attacker}
              currentWave={currentQIndex}
              totalWaves={questions.length}
              destructionPercent={destructionPercent}
              starsEarned={starsEarned}
              activeCombatEvent={activeCombatEvent}
              isAttacking={true}
              battleOver={false}
            />

            {/* Tactical Strike Command Panel (Embedded Question Incantation) */}
            <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black font-display">
                    WAVE {currentQIndex + 1} OF {questions.length}
                  </Badge>
                  <span className="text-xs font-bold text-slate-200">
                    Tactical Siege Command: {currentQ.subject || "Academic Mastery"}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> +20 DMG Strike Ready
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
                {currentQ.questionText}
              </p>

              {/* Tactical Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {currentQ.options.map((option, optIdx) => {
                  const isSelected = currentChosenOption === option;
                  let btnStyles = "bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-amber-500/40";
                  if (isSelected) {
                    btnStyles = "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10";
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(option)}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyles}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="truncate">{option}</span>
                      </span>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fire Siege Wave Button */}
              {currentChosenOption && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleNextQuestion}
                    className="gap-2 font-bold font-display bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 shadow-lg shadow-amber-500/20"
                  >
                    {currentQIndex < questions.length - 1 ? (
                      <>
                        Deploy Next Wave <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Unleash Final Siege Strike <Swords className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STAGE 3: RESOLVING CINEMATIC CLASH ─── */}
        {stage === "resolving" && (
          <div className="relative py-16 flex flex-col items-center justify-center text-center space-y-4">
            {vfxElement && <BattleVFX element={vfxElement} isActive={true} />}
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl animate-spin">
              ⚡
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-slate-100">
                Engaging Fortress Ramparts...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticating quiz responses, elemental Astra buffs, and citadel breach damage.
              </p>
            </div>
          </div>
        )}

        {/* ─── STAGE 4: CLASH OF CLANS AUTHENTIC 3-STAR VICTORY DISPLAY ─── */}
        {stage === "result" && battleResult && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            {/* War Battlefield showing final destruction outcome */}
            <BattleWarCanvas
              defender={defender}
              attacker={attacker}
              currentWave={questions.length}
              totalWaves={questions.length}
              destructionPercent={battleResult.finalDamage}
              starsEarned={starsEarned}
              activeCombatEvent={null}
              isAttacking={false}
              battleOver={true}
            />

            {/* Clash-Style 3 Golden Stars Pedestal */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-500/50 text-center shadow-2xl relative overflow-hidden">
              {/* Star Badges */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                {[1, 2, 3].map(starNum => (
                  <div
                    key={starNum}
                    className={`transition-all transform duration-500 ${
                      starsEarned >= starNum
                        ? "scale-125 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse"
                        : "scale-90 text-slate-800 opacity-40"
                    }`}
                  >
                    <Star className="w-10 h-10 sm:w-14 sm:h-14 fill-current" />
                  </div>
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-amber-300">
                {starsEarned === 3
                  ? "⭐⭐⭐ 100% TOTAL DESTRUCTION!"
                  : starsEarned >= 1
                  ? "⚔️ VICTORY ACHIEVED!"
                  : "🛡️ ASSAULT REPELLED!"}
              </h2>

              <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                {battleResult.summaryMessage}
              </p>

              {/* War Spoils & Loot Received */}
              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mt-4 pt-3 border-t border-slate-800">
                <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">War Flix</span>
                  <span className="text-sm sm:text-base font-black font-mono text-amber-400 flex items-center justify-center gap-1">
                    ⚡ +{actualFlixAwarded}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Trophies</span>
                  <span className="text-sm sm:text-base font-black font-mono text-amber-300 flex items-center justify-center gap-1">
                    🏆 +{battleResult.trophiesDelta}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Aura Points</span>
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-400 flex items-center justify-center gap-1">
                    ✨ +{(questionFeedback.filter(f => f.isCorrect).length * 25) + (battleResult.isVictory ? 75 : 15)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Breakdown Table */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>Siege Tactical Breakdown</span>
                <span className="font-mono">{battleResult.correctAnswers}/5 Correct Strikes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Knowledge Strikes:</span>
                  <span className="font-mono font-semibold">
                    {battleResult.correctAnswers} × 20 = {battleResult.baseAttack} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wall Mitigation:</span>
                  <span className="font-mono text-emerald-400">
                    -{battleResult.defenderWallReduction} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attacker Astra:</span>
                  <span className="font-mono text-amber-300">
                    +{battleResult.attackerAstraBonus} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tower Mitigation:</span>
                  <span className="font-mono text-emerald-400">
                    -{battleResult.defenderTowerReduction} pts
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-100 pt-1 border-t border-slate-800/60">
                  <span>Gross Assault:</span>
                  <span className="font-mono text-amber-400">
                    {battleResult.totalAttackScore} pts
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-100 pt-1 border-t border-slate-800/60">
                  <span>Gross Defense:</span>
                  <span className="font-mono text-emerald-400">
                    -{battleResult.totalDefenseReduction} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Close / Return Button */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => {
                  onBattleFinished();
                  onClose();
                }}
                className="w-full sm:w-auto font-bold font-display bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 px-6 rounded-xl"
              >
                Return to War Arena
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};
