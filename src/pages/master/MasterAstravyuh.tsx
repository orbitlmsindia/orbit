import React, { useState, useEffect } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import {
  AstravyuhSettings,
  StudentKingdom,
  BattleLogEntry,
  FlixAuditEntry,
  BattleAstraId
} from "@/types/astravyuh";
import {
  getAstravyuhSettings,
  saveAstravyuhSettings,
  getAllKingdoms,
  syncRealKingdomsFromDatabase,
  getBattleLogs,
  getFlixAuditLogs,
  BATTLE_ASTRAS,
  BATTLE_ASTRAS_LIST
} from "@/services/astravyuhService";
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
  Sliders,
  DollarSign,
  Lock,
  Globe,
  Activity,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MasterAstravyuh() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AstravyuhSettings>(getAstravyuhSettings());
  const [kingdoms, setKingdoms] = useState<StudentKingdom[]>([]);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<FlixAuditEntry[]>([]);

  // Master Global Settings state
  const [gameEnabled, setGameEnabled] = useState(settings.gameEnabled);
  const [victoryThreshold, setVictoryThreshold] = useState(settings.victoryDamageThreshold);
  const [winFlix, setWinFlix] = useState(settings.battleRewards.winFlix);
  const [lossFlix, setLossFlix] = useState(settings.battleRewards.lossFlix);
  const [dailyFlixLimit, setDailyFlixLimit] = useState(settings.battleRewards.dailyFlixLimit);

  // Dynamic Astra Prices
  const [astraPrices, setAstraPrices] = useState<Record<BattleAstraId, number>>({
    "agni-astra": settings.astraPrices?.["agni-astra"] || 250,
    "varuna-astra": settings.astraPrices?.["varuna-astra"] || 250,
    "vajra-astra": settings.astraPrices?.["vajra-astra"] || 350
  });

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

  useEffect(() => {
    setKingdoms(getAllKingdoms());
    setBattleLogs(getBattleLogs());
    setAuditLogs(getFlixAuditLogs());

    syncRealKingdomsFromDatabase().then((updated) => {
      if (updated && updated.length > 0) setKingdoms(updated);
    });

    const handleDirUpdate = (e: any) => {
      if (e.detail) setKingdoms(e.detail);
    };
    window.addEventListener("astravyuh_directory_updated", handleDirUpdate);
    return () => window.removeEventListener("astravyuh_directory_updated", handleDirUpdate);
  }, []);

  const handleSaveMasterConfig = () => {
    try {
      const updated = saveAstravyuhSettings({
        gameEnabled,
        victoryDamageThreshold: Number(victoryThreshold),
        astraPrices,
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
        title: "Master Configuration Applied! 👑",
        description: "Global economy, pricing, and game flags have been updated platform-wide."
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to save configuration."
      });
    }
  };

  // Aggregated analytics
  const totalBattles = battleLogs.length;
  const totalWins = battleLogs.filter(b => b.isVictory).length;
  const totalFlixIssued = auditLogs
    .filter(a => a.amount > 0)
    .reduce((acc, a) => acc + a.amount, 0);
  const totalFlixBurned = Math.abs(
    auditLogs.filter(a => a.amount < 0).reduce((acc, a) => acc + a.amount, 0)
  );

  return (
    <MasterLayout
      headerTitle="ASTRAVYUH Global Control Center"
      headerDescription="Authoritative game economy, pricing matrix, global kill-switch, and multi-tenant security monitoring."
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Top Control Header */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-[#0B0F19] to-slate-950 p-6 sm:p-7 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-[11px] px-2.5 py-0.5 uppercase tracking-wider">
                ROOT MASTER COMMAND
              </Badge>
              <span className="text-xs text-amber-400 font-semibold font-serif">
                Global Game Governance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-100">
              SINVERSE: ASTRAVYUH Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centrally regulate Astra prices, building upgrade economics, battle limits, and audit platform security.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-slate-200">Global Kill Switch</div>
                <div className="text-[10px] text-slate-400">Controls student entrance</div>
              </div>
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
                {gameEnabled ? "LIVE GLOBALLY" : "HALTED"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Global Analytics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Total Registered Empires</span>
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {kingdoms.length}
              </div>
              <p className="text-[11px] text-slate-500">Across all cohorts & colleges</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Battles & Win Rate</span>
                <Activity className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100">
                {totalBattles}
              </div>
              <p className="text-[11px] text-slate-500">
                {totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0}% Victory Breach Rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Flix Issued</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                +⚡ {totalFlixIssued}
              </div>
              <p className="text-[11px] text-slate-500">Battle spoils & awards</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Flix Economy Burn</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                -⚡ {totalFlixBurned}
              </div>
              <p className="text-[11px] text-slate-500">Upgrades, Astras, skins</p>
            </CardContent>
          </Card>
        </div>

        {/* Master Admin Management Tabs */}
        <Tabs defaultValue="economy" className="space-y-6">
          <TabsList className="bg-slate-950 border border-slate-800 p-1 rounded-2xl flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-4 max-w-xl w-full">
            <TabsTrigger value="economy" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              Economy & Pricing
            </TabsTrigger>
            <TabsTrigger value="structures" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Upgrade Matrix
            </TabsTrigger>
            <TabsTrigger value="astras" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Astra Catalog
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl text-xs font-bold shrink-0 sm:shrink whitespace-nowrap px-3 py-2">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Security & Audit
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: ECONOMY & PRICING CONFIG ─── */}
          <TabsContent value="economy" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Battle Rewards & Daily Earning Caps
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Regulate victory damage thresholds and currency payouts to protect LMS balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Victory Damage Required (%)</Label>
                    <Input
                      type="number"
                      value={victoryThreshold}
                      onChange={(e) => setVictoryThreshold(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Standard: 60%</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Win Flix Reward (⚡)</Label>
                    <Input
                      type="number"
                      value={winFlix}
                      onChange={(e) => setWinFlix(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Standard: 40 Flix</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Defeat Flix Reward (⚡)</Label>
                    <Input
                      type="number"
                      value={lossFlix}
                      onChange={(e) => setLossFlix(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Effort grant: 10 Flix</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Daily Battle Flix Cap (⚡)</Label>
                    <Input
                      type="number"
                      value={dailyFlixLimit}
                      onChange={(e) => setDailyFlixLimit(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">Anti-farming daily ceiling</p>
                  </div>
                </div>

                {/* Master Configurable Astra Prices */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Master Astra Pricing Configuration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Agni Astra (🔥 Attack +10)</Label>
                      <Input
                        type="number"
                        value={astraPrices["agni-astra"]}
                        onChange={(e) => setAstraPrices(prev => ({ ...prev, "agni-astra": Number(e.target.value) }))}
                        className="bg-slate-950 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Varuna Astra (🌊 Defense -10)</Label>
                      <Input
                        type="number"
                        value={astraPrices["varuna-astra"]}
                        onChange={(e) => setAstraPrices(prev => ({ ...prev, "varuna-astra": Number(e.target.value) }))}
                        className="bg-slate-950 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Vajra Astra (⚡ 5/5 Bonus +15)</Label>
                      <Input
                        type="number"
                        value={astraPrices["vajra-astra"]}
                        onChange={(e) => setAstraPrices(prev => ({ ...prev, "vajra-astra": Number(e.target.value) }))}
                        className="bg-slate-950 border-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveMasterConfig} className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
                    <Save className="w-4 h-4" />
                    Save Master Economy Configurations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 2: STRUCTURE UPGRADE COSTS MATRIX ─── */}
          <TabsContent value="structures" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Building Fortification Tier Costs Matrix
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Global Flix prices required to upgrade Royal Castle, Royal Wall, and Defense Tower to Tiers 2, 3, 4, and 5.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Castle */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>Royal Castle (Main Bastion)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">Level {lvl} Cost</Label>
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

                {/* Wall */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                    <span>🧱</span>
                    <span>Royal Wall (Outer Rampart)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">Level {lvl} Cost</Label>
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

                {/* Tower */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                    <span>🗼</span>
                    <span>Defense Tower (Prana Turret)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[2, 3, 4, 5].map((lvl, idx) => (
                      <div key={lvl} className="space-y-1">
                        <Label className="text-[11px] text-slate-400">Level {lvl} Cost</Label>
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
                  <Button onClick={handleSaveMasterConfig} className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
                    <Save className="w-4 h-4" />
                    Save Structure Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 3: ASTRA CATALOG & AUDIT ─── */}
          <TabsContent value="astras" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center justify-between">
                  <span>Supported Battle Astras & Lore Archive</span>
                  <Badge className="bg-emerald-950 border-emerald-500/40 text-emerald-300 text-xs">
                    3 Active Battle Astras
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Inspect the active combat abilities, current pricing, and element assignments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {BATTLE_ASTRAS_LIST.map((astra) => (
                    <div
                      key={astra.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                          {astra.icon}
                        </span>
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{astra.name}</div>
                          <div className="text-[11px] text-amber-400 font-serif">{astra.sanskritName}</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/90 text-xs space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Combat Effect</div>
                        <div className="text-slate-200 font-semibold">{astra.ability}</div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Current Cost:</span>
                        <span className="font-mono font-bold text-amber-400">⚡ {astra.cost} Flix</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 4: SECURITY & TRANSACTION AUDIT ─── */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-slate-100 flex items-center justify-between">
                  <span>Flix Transaction & Battle Abuse Ledger</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {auditLogs.length} Operations Logged
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Comprehensive audit trail of upgrades, marketplace acquisitions, battle rewards, and instructor grants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No transactions recorded yet in audit registry.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {auditLogs.slice(0, 15).map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-200">
                            {log.details || log.type}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleString()} • User: {log.userId}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                          <span className="text-slate-400 text-[11px]">
                            Balance: {log.balanceBefore} ➔ {log.balanceAfter}
                          </span>
                          <span
                            className={`font-bold ${
                              log.amount >= 0 ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {log.amount >= 0 ? "+" : ""}
                            {log.amount} ⚡
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
    </MasterLayout>
  );
}
