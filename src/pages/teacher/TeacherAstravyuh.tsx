import React, { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { StudentKingdom, BattleLogEntry, FlixAuditEntry } from "@/types/astravyuh";
import {
  getAllKingdoms,
  syncRealKingdomsFromDatabase,
  getBattleLogs,
  BATTLE_ASTRAS,
  isBatchBattleEnabled,
  setBatchBattleStatus,
  instructorAwardFlix,
  getFlixAuditLogs
} from "@/services/astravyuhService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Shield,
  Swords,
  Zap,
  Users,
  Trophy,
  Gift,
  AlertTriangle,
  History,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeacherAstravyuh() {
  const { toast } = useToast();
  const [kingdoms, setKingdoms] = useState<StudentKingdom[]>([]);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<FlixAuditEntry[]>([]);

  // Teacher batch scope
  const [selectedBatch, setSelectedBatch] = useState<string>("Alpha Cohort 2026");
  const [batchEnabled, setBatchEnabled] = useState<boolean>(true);

  // Award modal state
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<StudentKingdom | null>(null);
  const [awardAmount, setAwardAmount] = useState<number>(25);
  const [awardReason, setAwardReason] = useState<string>("Outstanding Quiz Performance & Assignment Submission");

  useEffect(() => {
    const allK = getAllKingdoms();
    setKingdoms(allK);
    setBattleLogs(getBattleLogs());
    setAuditLogs(getFlixAuditLogs().filter(l => l.type === "instructor_award"));
    setBatchEnabled(isBatchBattleEnabled(selectedBatch));

    syncRealKingdomsFromDatabase().then((updated) => {
      if (updated && updated.length > 0) setKingdoms(updated);
    });

    const handleDirUpdate = (e: any) => {
      if (e.detail) setKingdoms(e.detail);
    };
    window.addEventListener("astravyuh_directory_updated", handleDirUpdate);
    return () => window.removeEventListener("astravyuh_directory_updated", handleDirUpdate);
  }, [selectedBatch]);

  const handleToggleBatchBattle = (enabled: boolean) => {
    setBatchBattleStatus(selectedBatch, enabled);
    setBatchEnabled(enabled);
    toast({
      title: enabled ? "Battle Participation Allowed" : "Battle Participation Paused",
      description: `War Arena access for ${selectedBatch} is now ${enabled ? "active" : "paused"}.`
    });
  };

  const handleOpenAwardModal = (student: StudentKingdom) => {
    setTargetStudent(student);
    setAwardAmount(25);
    setAwardModalOpen(true);
  };

  const handleConfirmAward = () => {
    if (!targetStudent) return;
    const res = instructorAwardFlix(
      targetStudent.studentId,
      awardAmount,
      awardReason,
      "instructor_current",
      selectedBatch
    );

    if (res.success) {
      toast({
        title: "Flix Award Conferred! ⚡",
        description: res.message
      });
      setAuditLogs(getFlixAuditLogs().filter(l => l.type === "instructor_award"));
      setAwardModalOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Award Failed",
        description: res.message
      });
    }
  };

  // Filter students by authorized batch
  const batchStudents = kingdoms.filter(k => k.batch === selectedBatch);
  const totalWins = batchStudents.reduce((acc, k) => acc + k.battleWins, 0);
  const totalBattles = batchStudents.reduce((acc, k) => acc + k.battleWins + k.battleLosses, 0);
  const totalTrophies = batchStudents.reduce((acc, k) => acc + k.trophies, 0);
  const avgCitadel = batchStudents.length > 0
    ? Math.round(batchStudents.reduce((acc, k) => acc + k.castleLevel + k.wallLevel + k.towerLevel, 0) / batchStudents.length)
    : 0;

  return (
    <TeacherLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Header */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-[#0B0F19] to-slate-950 p-6 sm:p-7 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-[11px] px-2.5 py-0.5 uppercase tracking-wider">
                INSTRUCTOR ASTRAVYUH OVERSIGHT
              </Badge>
              <span className="text-xs text-amber-400 font-semibold font-serif">
                Batch Engagement & Learning Rewards
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-100">
              Student Kingdom Progression & Battle Monitoring
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Inspect your cohort's fortification levels, monitor knowledge battle outcomes, and confer learning Flix awards.
            </p>
          </div>

          {/* Batch Selector & Battle Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none"
            >
              <option value="Alpha Cohort 2026">Alpha Cohort 2026</option>
              <option value="Beta Cohort 2026">Beta Cohort 2026</option>
            </select>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="text-xs text-slate-300">Batch Arena Access:</span>
              <Switch
                checked={batchEnabled}
                onCheckedChange={handleToggleBatchBattle}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Batch Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Batch Warriors</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {batchStudents.length}
              </div>
              <p className="text-[11px] text-slate-500">Enrolled in {selectedBatch}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Battles Fought</span>
                <Swords className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {totalBattles}
              </div>
              <p className="text-[11px] text-slate-500">{totalWins} Victories ({totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0}%)</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Avg Fortress Tier</span>
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                Level {avgCitadel}
              </div>
              <p className="text-[11px] text-slate-500">Combined structures avg</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Batch Trophies</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                🏆 {totalTrophies}
              </div>
              <p className="text-[11px] text-slate-500">Cumulative arena rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Student Progression in Teacher's Cohort */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-100 flex items-center justify-between">
              <span>{selectedBatch} — Student Empires</span>
              <Badge variant="outline" className="text-xs font-mono">
                {batchStudents.length} Students
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Inspect individual castle structures and grant controlled academic achievement awards (up to ⚡ 100 Flix).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No students enrolled in this cohort yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {batchStudents.map((s) => {
                  const astra = s.equippedAstraId ? BATTLE_ASTRAS[s.equippedAstraId] : null;

                  return (
                    <div
                      key={s.studentId}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm">
                          🏰
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 text-sm">
                            {s.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.studentEmail}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                        <div className="text-slate-300 font-mono">
                          <span className="text-slate-500">C:</span> L{s.castleLevel}{" "}
                          <span className="text-slate-500">W:</span> L{s.wallLevel}{" "}
                          <span className="text-slate-500">T:</span> L{s.towerLevel}
                        </div>

                        {astra ? (
                          <Badge className="bg-slate-950 border-amber-500/30 text-amber-300 text-[11px]">
                            {astra.icon} {astra.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-600">No Astra</span>
                        )}

                        <div className="text-amber-400 font-bold font-mono">
                          🏆 {s.trophies}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenAwardModal(s)}
                          className="text-xs font-bold gap-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-400" />
                          Award Learning Flix
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructor Flix Awards History */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Recent Academic Flix Awards
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Audit trail of learning bonuses granted to students for course completion and academic merit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No instructor Flix awards issued yet in this session.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">
                        {log.details}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      +{log.amount} ⚡
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Award Flix Dialog */}
        <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border border-amber-500/30 text-slate-100 shadow-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                Award Learning Flix: {targetStudent?.studentName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Confer Flix for homework completion, verified quizzes, or research contributions. Max 100 Flix per award.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Flix Amount (1 - 100 ⚡)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="bg-slate-900 border-slate-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Academic Citation / Reason</Label>
                <Input
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="e.g. Completed Day 1 Lab & Quiz with 100% score"
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setAwardModalOpen(false)} className="w-full sm:w-auto text-slate-400">
                Cancel
              </Button>
              <Button onClick={handleConfirmAward} className="w-full sm:w-auto font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
                Confirm & Issue Flix ⚡
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TeacherLayout>
  );
}
