import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  AstravyuhSettings,
  StudentKingdom,
  BattleLogEntry
} from "@/types/astravyuh";
import {
  getAstravyuhSettings,
  saveAstravyuhSettings,
  getAllKingdoms,
  syncRealKingdomsFromDatabase,
  getBattleLogs,
  BATTLE_ASTRAS
} from "@/services/astravyuhService";
import { getFluxBalance, setFluxBalance } from "@/services/themeService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Swords,
  Zap,
  Settings,
  Users,
  History,
  Save,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Sliders,
  Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAstravyuh() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AstravyuhSettings>(getAstravyuhSettings());
  const [kingdoms, setKingdoms] = useState<StudentKingdom[]>(getAllKingdoms());
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>(getBattleLogs());

  // Form state for game settings
  const [gameEnabled, setGameEnabled] = useState(settings.gameEnabled);
  const [victoryThreshold, setVictoryThreshold] = useState(settings.victoryDamageThreshold);
  const [winFlix, setWinFlix] = useState(settings.battleRewards.winFlix);
  const [lossFlix, setLossFlix] = useState(settings.battleRewards.lossFlix);
  const [dailyFlixLimit, setDailyFlixLimit] = useState(settings.battleRewards.dailyFlixLimit);

  // Upgrade costs
  const [castleCosts, setCastleCosts] = useState<[number, number, number, number]>(
    settings.upgradeCosts.castle
  );
  const [wallCosts, setWallCosts] = useState<[number, number, number, number]>(
    settings.upgradeCosts.wall
  );
  const [towerCosts, setTowerCosts] = useState<[number, number, number, number]>(
    settings.upgradeCosts.tower
  );

  // Award bonus flix modal/input
  const [awardTargetId, setAwardTargetId] = useState<string | null>(null);
  const [bonusFlixAmount, setBonusFlixAmount] = useState<number>(50);

  useEffect(() => {
    setKingdoms(getAllKingdoms());
    setBattleLogs(getBattleLogs());

    syncRealKingdomsFromDatabase().then((updated) => {
      if (updated && updated.length > 0) setKingdoms(updated);
    });

    const handleDirUpdate = (e: any) => {
      if (e.detail) setKingdoms(e.detail);
    };
    window.addEventListener("astravyuh_directory_updated", handleDirUpdate);
    return () => window.removeEventListener("astravyuh_directory_updated", handleDirUpdate);
  }, []);

  const handleSaveSettings = () => {
    try {
      const updated = saveAstravyuhSettings({
        gameEnabled,
        victoryDamageThreshold: Number(victoryThreshold),
        upgradeCosts: {
          castle: castleCosts,
          wall: wallCosts,
          tower: towerCosts
        },
        battleRewards: {
          ...settings.battleRewards,
          winFlix: Number(winFlix),
          lossFlix: Number(lossFlix),
          dailyFlixLimit: Number(dailyFlixLimit)
        }
      });
      setSettings(updated);
      toast({
        title: "Settings Saved! ✅",
        description: "ASTRAVYUH game configurations and costs updated successfully."
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to save settings."
      });
    }
  };

  const handleAwardBonusFlix = (target: StudentKingdom) => {
    const cur = getFluxBalance();
    setFluxBalance(cur + bonusFlixAmount);
    toast({
      title: "Flix Grant Conferred! ⚡",
      description: `Awarded ⚡ ${bonusFlixAmount} Orbit Flix to ${target.studentName} for academic excellence.`
    });
    setAwardTargetId(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Top Header */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-[#0B0F19] to-slate-950 p-6 sm:p-7 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-[11px] px-2.5 py-0.5 uppercase tracking-wider">
                ASTRAVYUH COMMAND
              </Badge>
              <span className="text-xs text-amber-400 font-semibold font-serif">
                Master Admin & Instructor Oversight
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-100">
              Kingdoms & War Arena Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure game balancing, structure upgrade costs, daily battle rewards, and inspect student kingdom progression.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300">Global Game Status:</span>
              <Switch
                checked={gameEnabled}
                onCheckedChange={setGameEnabled}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Badge
                className={`text-[10px] font-mono ${
                  gameEnabled
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}
              >
                {gameEnabled ? "LIVE" : "PAUSED"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Analytics Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Total Empires</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {kingdoms.length}
              </div>
              <p className="text-[11px] text-slate-500">Active student citadels</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Battles Fought</span>
                <Swords className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {battleLogs.length}
              </div>
              <p className="text-[11px] text-slate-500">Quiz siege engagements</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Victory Threshold</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {settings.victoryDamageThreshold}%
              </div>
              <p className="text-[11px] text-slate-500">Min damage to breach</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Daily Flix Cap</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                ⚡ {settings.battleRewards.dailyFlixLimit}
              </div>
              <p className="text-[11px] text-slate-500">Anti-farming reward limit</p>
            </CardContent>
          </Card>
        </div>

        {/* Administration Tabs */}
        <Tabs defaultValue="balancing" className="space-y-6">
          <TabsList className="bg-slate-950 border border-slate-800 p-1 rounded-2xl flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-3 max-w-md w-full">
            <TabsTrigger value="balancing" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Balancing & Costs
            </TabsTrigger>
            <TabsTrigger value="kingdoms" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Student Empires
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Battle Audit
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: BALANCING & COSTS CONFIG ─── */}
          <TabsContent value="balancing" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Battle Rewards & Victory Parameters
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Tune victory conditions, daily reward caps, and trophy allocations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Victory Damage Required (%)</Label>
                    <Input
                      type="number"
                      value={victoryThreshold}
                      onChange={(e) => setVictoryThreshold(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Default: 60%</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Victory Flix Reward (⚡)</Label>
                    <Input
                      type="number"
                      value={winFlix}
                      onChange={(e) => setWinFlix(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Default: 40 Flix</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Daily Battle Flix Cap (⚡)</Label>
                    <Input
                      type="number"
                      value={dailyFlixLimit}
                      onChange={(e) => setDailyFlixLimit(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Max flix student can farm per day</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Building Upgrade Costs Matrix */}
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Structure Upgrade Costs Matrix (in Orbit Flix)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Configure the exact Flix required to upgrade structures from Level 1 up to Level 5.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Castle Costs */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                    <span>👑</span>
                    <span>Royal Castle Upgrade Costs</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">To Level {lvl}</Label>
                        <Input
                          type="number"
                          value={castleCosts[idx]}
                          onChange={(e) => {
                            const next = [...castleCosts] as [number, number, number, number];
                            next[idx] = Number(e.target.value);
                            setCastleCosts(next);
                          }}
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wall Costs */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-300">
                    <span>🧱</span>
                    <span>Royal Wall Upgrade Costs</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">To Level {lvl}</Label>
                        <Input
                          type="number"
                          value={wallCosts[idx]}
                          onChange={(e) => {
                            const next = [...wallCosts] as [number, number, number, number];
                            next[idx] = Number(e.target.value);
                            setWallCosts(next);
                          }}
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tower Costs */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-300">
                    <span>🗼</span>
                    <span>Defense Tower Upgrade Costs</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">To Level {lvl}</Label>
                        <Input
                          type="number"
                          value={towerCosts[idx]}
                          onChange={(e) => {
                            const next = [...towerCosts] as [number, number, number, number];
                            next[idx] = Number(e.target.value);
                            setTowerCosts(next);
                          }}
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveSettings}
                    className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                  >
                    <Save className="w-4 h-4" />
                    Save Game Configurations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 2: STUDENT KINGDOMS DIRECTORY ─── */}
          <TabsContent value="kingdoms" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center justify-between">
                  <span>Student Empires & Fortress Progression</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {kingdoms.length} Kingdoms Registered
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Inspect student kingdom fortifications, battle wins, trophies, and award learning-related Flix.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-800">
                  {kingdoms.map((k) => {
                    const astra = k.equippedAstraId ? BATTLE_ASTRAS[k.equippedAstraId] : null;

                    return (
                      <div
                        key={k.studentId}
                        className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm">
                            🏰
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 text-sm">
                              {k.studentName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {k.batch || "Cohort"} • {k.studentEmail}
                            </div>
                          </div>
                        </div>

                        {/* Levels & Astra */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                          <div className="text-slate-300 font-mono">
                            <span className="text-slate-500">Castle:</span> L{k.castleLevel}{" "}
                            <span className="text-slate-500">Wall:</span> L{k.wallLevel}{" "}
                            <span className="text-slate-500">Tower:</span> L{k.towerLevel}
                          </div>

                          {astra ? (
                            <Badge className="bg-slate-950 border-amber-500/30 text-amber-300 text-[11px]">
                              {astra.icon} {astra.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-600">No Astra</span>
                          )}

                          <div className="text-amber-400 font-bold font-mono">
                            🏆 {k.trophies}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAwardBonusFlix(k)}
                            className="text-xs font-semibold gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                          >
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            Award ⚡ 50 Flix
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 3: BATTLE AUDIT & ANTI-ABUSE ─── */}
          <TabsContent value="audit" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center justify-between">
                  <span>War Arena Battle Audit Log</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {battleLogs.length} Recent Logs
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Review battle integrity, correct answer counts, breach damage calculations, and reward distributions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {battleLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No battles logged yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {battleLogs.map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-200">
                            {log.attackerName} <span className="text-amber-400">vs</span> {log.defenderName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {new Date(log.timestamp).toLocaleString()} • ID: {log.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-300">
                            Answers: <strong>{log.correctAnswersCount}/5</strong>
                          </span>
                          <span className="text-amber-300">
                            Damage: <strong>{log.finalDamage}%</strong>
                          </span>
                          <Badge
                            className={`text-xs font-bold ${
                              log.isVictory
                                ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                                : "bg-red-950 border-red-500/40 text-red-300"
                            }`}
                          >
                            {log.isVictory ? "VICTORY" : "DEFENDED"}
                          </Badge>
                          <span className="text-amber-400 font-bold">
                            +{log.flixEarned} ⚡
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AdminLayout>
  );
}
