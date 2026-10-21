import React, { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import {
  StudentKingdom,
  StructureType,
  BattleAstraId,
  BattleLogEntry
} from "@/types/astravyuh";
import {
  getStudentKingdom,
  saveStudentKingdom,
  getEligibleOpponents,
  getBattleLogs,
  BATTLE_ASTRAS_LIST,
  BATTLE_ASTRAS,
  getOwnedAstras,
  purchaseBattleAstra,
  equipBattleAstra,
  KINGDOM_SKINS,
  KINGDOM_BACKGROUNDS,
  COSMETIC_RANKS,
  getOwnedSkins,
  purchaseKingdomSkin,
  getOwnedBackgrounds,
  purchaseKingdomBackground,
  getOwnedRanks,
  purchaseCosmeticRank,
  getAllKingdoms,
  getAstravyuhSettings,
  getDailyBattleFlixEarned,
  syncRealKingdomsFromDatabase
} from "@/services/astravyuhService";
import { getFluxBalance } from "@/services/themeService";
import { IsometricKingdom } from "@/components/astravyuh/IsometricKingdom";
import { BuildingUpgradeModal } from "@/components/astravyuh/BuildingUpgradeModal";
import { BattleArenaModal } from "@/components/astravyuh/BattleArenaModal";
import { AstraArsenalCard } from "@/components/astravyuh/AstraArsenalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Swords,
  Zap,
  Trophy,
  ShoppingBag,
  Sparkles,
  Flame,
  Droplets,
  Crown,
  History,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AstravyuhEmpire() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  // Active section tab
  const [activeTab, setActiveTab] = useState<string>(urlTab || "empire");

  // Core Game State
  const [kingdom, setKingdom] = useState<StudentKingdom>(getStudentKingdom());
  const [flixBalance, setFlixBalanceState] = useState<number>(getFluxBalance());
  const [dailyFlixEarned, setDailyFlixEarned] = useState<number>(getDailyBattleFlixEarned());
  const [ownedAstras, setOwnedAstras] = useState<BattleAstraId[]>(getOwnedAstras());
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>(getBattleLogs());
  const [opponents, setOpponents] = useState<StudentKingdom[]>([]);
  const [allKingdoms, setAllKingdoms] = useState<StudentKingdom[]>([]);

  // Modals state
  const [selectedStructure, setSelectedStructure] = useState<StructureType | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [battleDefender, setBattleDefender] = useState<StudentKingdom | null>(null);
  const [battleModalOpen, setBattleModalOpen] = useState(false);

  // Shop owned state
  const [ownedSkins, setOwnedSkins] = useState<string[]>(getOwnedSkins());
  const [ownedBackgrounds, setOwnedBackgrounds] = useState<string[]>(getOwnedBackgrounds());
  const [ownedRanks, setOwnedRanks] = useState<string[]>(getOwnedRanks());

  // Hall of Legends filters
  const [leaderboardFilter, setLeaderboardFilter] = useState<"all" | "batch" | "surya" | "chandra" | "vayu" | "agni">("all");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");

  const settings = getAstravyuhSettings();

  // Load user data, opponents, and sync events
  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, avatar_url, batch, department")
          .eq("id", user.id)
          .maybeSingle();

        const current = getStudentKingdom(user.id);
        const synced = {
          ...current,
          studentId: user.id,
          studentName: profile?.full_name || user.user_metadata?.full_name || current.studentName,
          studentEmail: user.email || current.studentEmail,
          avatarUrl: profile?.avatar_url || current.avatarUrl,
          batch: profile?.batch || current.batch,
          department: profile?.department || current.department || "AI and Machine Learning"
        };
        saveStudentKingdom(synced);
        setKingdom(synced);
      }

      // Sync real cohort database players
      const realKingdoms = await syncRealKingdomsFromDatabase();
      setAllKingdoms(realKingdoms);
      setOpponents(getEligibleOpponents());
    }
    initUser();

    setOpponents(getEligibleOpponents());
    setAllKingdoms(getAllKingdoms());

    const handleFlixUpdate = (e: any) => {
      setFlixBalanceState(e.detail ?? getFluxBalance());
    };
    const handleKingdomUpdate = (e: any) => {
      if (e.detail) setKingdom(e.detail);
    };
    const handleBattleLog = (e: any) => {
      setBattleLogs(getBattleLogs());
      setDailyFlixEarned(getDailyBattleFlixEarned());
    };
    const handleDirectoryUpdate = (e: any) => {
      if (e.detail) {
        setAllKingdoms(e.detail);
        setOpponents(getEligibleOpponents());
      }
    };

    window.addEventListener("orbit_flux_updated", handleFlixUpdate);
    window.addEventListener("astravyuh_kingdom_updated", handleKingdomUpdate);
    window.addEventListener("astravyuh_battle_logged", handleBattleLog);
    window.addEventListener("astravyuh_directory_updated", handleDirectoryUpdate);

    return () => {
      window.removeEventListener("orbit_flux_updated", handleFlixUpdate);
      window.removeEventListener("astravyuh_kingdom_updated", handleKingdomUpdate);
      window.removeEventListener("astravyuh_battle_logged", handleBattleLog);
      window.removeEventListener("astravyuh_directory_updated", handleDirectoryUpdate);
    };
  }, []);

  // Sync tab with URL if needed
  useEffect(() => {
    if (urlTab && ["empire", "arena", "arsenal", "bazaar", "legends"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/student/astravyuh/${value}`, { replace: true });
  };

  // Click on structure in isometric view
  const handleSelectStructure = (type: StructureType) => {
    setSelectedStructure(type);
    setUpgradeModalOpen(true);
  };

  // Launch battle against opponent
  const handleInitiateBattle = (target: StudentKingdom) => {
    setBattleDefender(target);
    setBattleModalOpen(true);
  };

  // Handle Astra Equip
  const handleEquipAstra = (astraId: BattleAstraId) => {
    const res = equipBattleAstra(astraId);
    if (res.success) {
      setKingdom(res.kingdom);
      toast({
        title: "Astra Equipped! ⚔️",
        description: res.message
      });
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Equip",
        description: res.message
      });
    }
  };

  const handleUnequipAstra = () => {
    const res = equipBattleAstra(null);
    setKingdom(res.kingdom);
    toast({
      title: "Astra Unequipped",
      description: "Battle slot cleared."
    });
  };

  const handlePurchaseAstra = (astraId: BattleAstraId) => {
    const res = purchaseBattleAstra(astraId);
    if (res.success) {
      setFlixBalanceState(res.remainingFlix);
      setOwnedAstras(getOwnedAstras());
      setKingdom(getStudentKingdom());
      toast({
        title: "Astra Acquired! ⚡",
        description: res.message
      });
    } else {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: res.message
      });
    }
  };

  // Shop skin purchase
  const handlePurchaseSkin = (skinId: string) => {
    const res = purchaseKingdomSkin(skinId);
    if (res.success) {
      setFlixBalanceState(res.remainingFlix);
      setOwnedSkins(getOwnedSkins());
      setKingdom(getStudentKingdom());
      toast({ title: "Citadel Skin Unlocked! 🏰", description: res.message });
    } else {
      toast({ variant: "destructive", title: "Purchase Failed", description: res.message });
    }
  };

  // Shop background purchase
  const handlePurchaseBg = (bgId: string) => {
    const res = purchaseKingdomBackground(bgId);
    if (res.success) {
      setFlixBalanceState(res.remainingFlix);
      setOwnedBackgrounds(getOwnedBackgrounds());
      setKingdom(getStudentKingdom());
      toast({ title: "Background Unlocked! 🌌", description: res.message });
    } else {
      toast({ variant: "destructive", title: "Purchase Failed", description: res.message });
    }
  };

  // Shop rank purchase
  const handlePurchaseRank = (rankId: string) => {
    const res = purchaseCosmeticRank(rankId);
    if (res.success) {
      setFlixBalanceState(res.remainingFlix);
      setOwnedRanks(getOwnedRanks());
      toast({ title: "Scholar Rank Conferred! 👑", description: res.message });
    } else {
      toast({ variant: "destructive", title: "Requirement Not Met", description: res.message });
    }
  };

  // Helper for House badges and clan styling
  const getHouseBadge = (house?: string) => {
    switch (house) {
      case 'surya':
        return { name: 'Surya House', icon: '☀️', gradient: 'from-amber-400 to-orange-500 text-amber-300 border-amber-500/40 bg-amber-500/10' };
      case 'chandra':
        return { name: 'Chandra House', icon: '🌙', gradient: 'from-cyan-400 to-blue-500 text-cyan-300 border-cyan-500/40 bg-cyan-500/10' };
      case 'vayu':
        return { name: 'Vayu House', icon: '🌪️', gradient: 'from-emerald-400 to-teal-500 text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
      case 'agni':
        return { name: 'Agni House', icon: '🔥', gradient: 'from-rose-500 to-red-600 text-rose-300 border-rose-500/40 bg-rose-500/10' };
      default:
        return { name: 'Vedic House', icon: '⚡', gradient: 'from-slate-400 to-slate-600 text-slate-300 border-slate-500/40 bg-slate-500/10' };
    }
  };

  // Leaderboard items with House & Cohort filtering
  const filteredLeaderboard = allKingdoms
    .filter(k => {
      if (leaderboardFilter === "batch") {
        return (k.batch && kingdom.batch && k.batch === kingdom.batch) || (k.department && kingdom.department && k.department === kingdom.department);
      }
      if (["surya", "chandra", "vayu", "agni"].includes(leaderboardFilter)) {
        return k.house === leaderboardFilter;
      }
      return true;
    })
    .filter(k => {
      if (!leaderboardSearch) return true;
      const q = leaderboardSearch.toLowerCase();
      return (
        k.studentName.toLowerCase().includes(q) ||
        k.batch?.toLowerCase().includes(q) ||
        k.department?.toLowerCase().includes(q) ||
        (k.equippedAstraId && BATTLE_ASTRAS[k.equippedAstraId]?.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.trophies - a.trophies);

  const equippedAstraObj = kingdom.equippedAstraId ? BATTLE_ASTRAS[kingdom.equippedAstraId] : null;

  if (!settings.gameEnabled) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-xl">
            🏰
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-100">
            Astravyuh Celestial Maintenance
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            SINVERSE: ASTRAVYUH is temporarily paused by platform administrators.
            Your kingdom, structures, Astras, and trophies are fully preserved. Please check back shortly!
          </p>
          <div className="pt-2">
            <Button
              onClick={() => navigate("/student")}
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-900"
            >
              Return to Student Dashboard
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* ─── TOP MASTER GAME HEADER ─── */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-slate-950 via-[#0B0F19] to-slate-950 p-5 sm:p-7 shadow-2xl">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-[11px] px-2.5 py-0.5 tracking-wider uppercase shadow-md">
                  SINVERSE: ASTRAVYUH
                </Badge>
                <span className="text-xs text-amber-400/90 font-serif font-bold">
                  Kingdoms of Knowledge
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-100 flex items-center gap-2">
                <span>Build Your Empire.</span>
                <span className="text-amber-400">Master Your Astras.</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1">
                Fortify your ancient citadel with learning achievements, wield mythic elemental Astras, and challenge rival kingdoms in knowledge battles.
              </p>
            </div>

            {/* Quick Player Status Bar */}
            <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-2 sm:p-3 shadow-xl backdrop-blur-md w-full md:w-auto">
              {/* Flix Balance */}
              <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Orbit Flix
                </div>
                <div className="text-xs sm:text-base font-bold text-amber-400 font-mono flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  {flixBalance} ⚡
                </div>
              </div>

              {/* Trophies */}
              <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Trophies
                </div>
                <div className="text-xs sm:text-base font-bold text-amber-300 font-mono flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  {kingdom.trophies} 🏆
                </div>
              </div>

              {/* Equipped Astra Indicator */}
              <div className="col-span-2 min-[440px]:col-span-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Active Astra
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1">
                  {equippedAstraObj ? (
                    <>
                      <span>{equippedAstraObj.icon}</span>
                      <span className="truncate max-w-[85px] sm:max-w-[90px]">{equippedAstraObj.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-500 text-xs">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── NAVIGATION TABS (5 SECTIONS) ─── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-950/90 border border-slate-800 p-1.5 rounded-2xl flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 gap-1.5 h-auto w-full">
            <TabsTrigger
              value="empire"
              className="rounded-xl py-2 sm:py-2.5 px-3 sm:px-2 text-xs sm:text-sm font-bold font-display data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap"
            >
              <span>🏰</span>
              <span>1. My Empire</span>
            </TabsTrigger>
            <TabsTrigger
              value="arena"
              className="rounded-xl py-2 sm:py-2.5 px-3 sm:px-2 text-xs sm:text-sm font-bold font-display data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap"
            >
              <span>⚔️</span>
              <span>2. War Arena</span>
            </TabsTrigger>
            <TabsTrigger
              value="arsenal"
              className="rounded-xl py-2 sm:py-2.5 px-3 sm:px-2 text-xs sm:text-sm font-bold font-display data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap"
            >
              <span>⚡</span>
              <span>3. Astra Arsenal</span>
            </TabsTrigger>
            <TabsTrigger
              value="bazaar"
              className="rounded-xl py-2 sm:py-2.5 px-3 sm:px-2 text-xs sm:text-sm font-bold font-display data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap"
            >
              <span>🛍️</span>
              <span>4. Royal Bazaar</span>
            </TabsTrigger>
            <TabsTrigger
              value="legends"
              className="rounded-xl py-2 sm:py-2.5 px-3 sm:px-2 text-xs sm:text-sm font-bold font-display data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap"
            >
              <span>👑</span>
              <span>5. Hall of Legends</span>
            </TabsTrigger>
          </TabsList>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: MY EMPIRE — KINGDOM BUILDER */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="empire" className="space-y-6">
            {/* 2D Isometric Kingdom Display */}
            <IsometricKingdom
              kingdom={kingdom}
              onSelectStructure={handleSelectStructure}
              onNavigateTab={handleTabChange}
              flixBalance={flixBalance}
            />

            {/* Structure Quick-Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Royal Castle */}
              <Card
                onClick={() => handleSelectStructure("castle")}
                className="cursor-pointer border-slate-800 bg-slate-900/80 hover:border-amber-500/50 transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      👑
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">Royal Castle</h4>
                      <p className="text-xs text-slate-400">Core Citadel</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      Lvl {kingdom.castleLevel} / 5
                    </Badge>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">
                      -{kingdom.castleLevel * 1} DMG
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Defense Tower */}
              <Card
                onClick={() => handleSelectStructure("tower")}
                className="cursor-pointer border-slate-800 bg-slate-900/80 hover:border-blue-500/50 transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      🗼
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">Defense Tower</h4>
                      <p className="text-xs text-slate-400">Prana Turret</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                      Lvl {kingdom.towerLevel} / 5
                    </Badge>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">
                      -{kingdom.towerLevel * 2} DMG
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Royal Wall */}
              <Card
                onClick={() => handleSelectStructure("wall")}
                className="cursor-pointer border-slate-800 bg-slate-900/80 hover:border-amber-500/50 transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-slate-800 border border-slate-700">
                      🧱
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">Royal Wall</h4>
                      <p className="text-xs text-slate-400">Outer Ramparts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-slate-700 text-slate-200 text-xs">
                      Lvl {kingdom.wallLevel} / 5
                    </Badge>
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">
                      -{kingdom.wallLevel * 2} DMG
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kingdom Career Records */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Battle Wins</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {kingdom.battleWins}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Battle Losses</div>
                <div className="text-xl font-bold font-mono text-slate-400 mt-0.5">
                  {kingdom.battleLosses}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Win Rate</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {kingdom.battleWins + kingdom.battleLosses > 0
                    ? Math.round(
                        (kingdom.battleWins /
                          (kingdom.battleWins + kingdom.battleLosses)) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Trophies</div>
                <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                  🏆 {kingdom.trophies}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: WAR ARENA — ATTACK OTHER KINGDOMS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="arena" className="space-y-6">
            {/* Arena Header Status */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-red-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  ⚔️
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-display">
                    Asynchronous Citadel Siege Arena
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defenders do not need to be online. Your knowledge accuracy determines the assault power!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  Daily Battle Flix: <strong className="text-amber-400 font-mono">{dailyFlixEarned} / {settings.battleRewards.dailyFlixLimit} ⚡</strong>
                </div>
              </div>
            </div>

            {/* Eligible Opponents Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />
                  Eligible Rival Kingdoms
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Matched by Kingdom Strength
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opponents.map((opp) => {
                  const oppAstra = opp.equippedAstraId ? BATTLE_ASTRAS[opp.equippedAstraId] : null;
                  const oppDef = opp.wallLevel * 2 + opp.towerLevel * 2 + opp.castleLevel * 1 + (opp.equippedAstraId === "varuna-astra" ? 10 : 0);

                  return (
                    <Card
                      key={opp.studentId}
                      className="border-slate-800 bg-slate-900/80 hover:border-amber-500/40 transition-all duration-200"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-lg font-bold">
                              🏰
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-100 text-sm truncate max-w-[150px]">
                                {opp.studentName}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {opp.batch || "Cohort Scholar"}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs font-mono">
                            🏆 {opp.trophies}
                          </Badge>
                        </div>

                        {/* Defenses Breakdown */}
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Defensive Shield:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              -{oppDef} DMG
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Wall / Tower / Castle:</span>
                            <span className="font-mono text-slate-300">
                              L{opp.wallLevel} / L{opp.towerLevel} / L{opp.castleLevel}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px] items-center pt-0.5">
                            <span>Equipped Astra:</span>
                            {oppAstra ? (
                              <span className="text-amber-300 font-semibold flex items-center gap-1">
                                {oppAstra.icon} {oppAstra.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">None</span>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleInitiateBattle(opp)}
                          className="w-full gap-2 font-bold font-display bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-slate-950 text-xs shadow-md"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          Launch Siege Attack
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Recent Battle History Log */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" />
                Recent Battle Logs
              </h3>

              {battleLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
                  No battles recorded yet. Launch your first attack above to make history!
                </div>
              ) : (
                <div className="space-y-2">
                  {battleLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">
                          {log.isVictory ? "🏆" : "🛡️"}
                        </span>
                        <div>
                          <div className="font-bold text-slate-200">
                            {log.attackerName} vs {log.defenderName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.correctAnswersCount}/5 Correct • {log.finalDamage}% Citadel Breach
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={`text-xs font-mono font-bold ${
                            log.isVictory
                              ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                              : "bg-red-950 border-red-500/40 text-red-300"
                          }`}
                        >
                          {log.isVictory ? "VICTORY" : "DEFEAT"}
                        </Badge>
                        <span className="font-mono font-bold text-amber-400">
                          +{log.flixEarned} ⚡
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            log.trophiesDelta >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {log.trophiesDelta >= 0 ? "+" : ""}
                          {log.trophiesDelta} 🏆
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: ASTRA ARSENAL — PURCHASE & EQUIP ASTRAS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="arsenal" className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-slate-100">
                  SINVERSE: ASTRAVYUH Battle Astras Rules
                </p>
                <p>
                  Only <strong className="text-amber-400">three official Battle Astras</strong> possess active offensive and defensive combat mechanics in the War Arena.
                  Students may equip <strong className="text-slate-100">only one Astra at a time</strong>.
                  All historical weapons previously unlocked remain intact in your legacy archives.
                </p>
              </div>
            </div>

            {/* The 3 Battle Astras Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {BATTLE_ASTRAS_LIST.map((astra) => (
                <AstraArsenalCard
                  key={astra.id}
                  astra={astra}
                  isOwned={ownedAstras.includes(astra.id)}
                  isEquipped={kingdom.equippedAstraId === astra.id}
                  flixBalance={flixBalance}
                  onEquip={handleEquipAstra}
                  onUnequip={handleUnequipAstra}
                  onPurchase={handlePurchaseAstra}
                />
              ))}
            </div>

            {/* Single Equip Enforcement Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
              Active Battle Wield:{" "}
              {equippedAstraObj ? (
                <span className="text-amber-400 font-bold">
                  {equippedAstraObj.name} ({equippedAstraObj.ability})
                </span>
              ) : (
                <span className="text-slate-500">No Astra currently equipped.</span>
              )}
            </div>
          </TabsContent>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 4: ROYAL BAZAAR — SKINS, THEMES & PURCHASES */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="bazaar" className="space-y-6">
            {/* Castle Skins Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🏰</span>
                <span>Kingdom Castle Skins</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KINGDOM_SKINS.map((skin) => {
                  const isOwned = ownedSkins.includes(skin.id);
                  const isActive = kingdom.activeSkinId === skin.id;

                  return (
                    <Card
                      key={skin.id}
                      className={`border bg-slate-900/80 transition-all ${
                        isActive
                          ? "border-amber-400 ring-1 ring-amber-400"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className={`h-2 bg-gradient-to-r ${skin.bannerGradient}`} />
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-100 text-sm">{skin.name}</h4>
                          {isActive && (
                            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0 h-4">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 min-h-[32px]">
                          {skin.description}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80">
                          {isOwned ? (
                            isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full text-xs font-bold border-amber-500/40 text-amber-300"
                              >
                                Currently Applied
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  saveStudentKingdom({ ...kingdom, activeSkinId: skin.id });
                                  toast({ title: "Skin Applied!", description: skin.name });
                                }}
                                className="w-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                Apply Skin
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseSkin(skin.id)}
                              disabled={flixBalance < skin.cost}
                              className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                            >
                              Unlock (⚡ {skin.cost} Flix)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Kingdom Backgrounds Section */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span>🌌</span>
                <span>Kingdom Background Realms</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KINGDOM_BACKGROUNDS.map((bg) => {
                  const isOwned = ownedBackgrounds.includes(bg.id);
                  const isActive = kingdom.activeBackgroundId === bg.id;

                  return (
                    <Card
                      key={bg.id}
                      className={`border bg-slate-900/80 transition-all ${
                        isActive
                          ? "border-blue-400 ring-1 ring-blue-400"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-100 text-sm">{bg.name}</h4>
                          {isActive && (
                            <Badge className="bg-blue-500 text-slate-950 font-bold text-[10px] px-1.5 py-0 h-4">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 min-h-[32px]">
                          {bg.description}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80">
                          {isOwned ? (
                            isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full text-xs font-bold border-blue-500/40 text-blue-300"
                              >
                                Realm Active
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  saveStudentKingdom({ ...kingdom, activeBackgroundId: bg.id });
                                  toast({ title: "Background Realm Applied!", description: bg.name });
                                }}
                                className="w-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                Apply Realm
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseBg(bg.id)}
                              disabled={flixBalance < bg.cost}
                              className="w-full text-xs font-bold bg-blue-500 hover:bg-blue-600 text-slate-950"
                            >
                              Unlock (⚡ {bg.cost} Flix)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Cosmetic Scholar Ranks */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>👑</span>
                <span>Cosmetic Scholar Ranks</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {COSMETIC_RANKS.map((rank) => {
                  const isOwned = ownedRanks.includes(rank.id);
                  const meetsTrophies = !rank.minTrophies || kingdom.trophies >= rank.minTrophies;

                  return (
                    <Card
                      key={rank.id}
                      className="border-slate-800 bg-slate-900/80 hover:border-slate-700"
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{rank.badge}</span>
                          <div>
                            <h4 className="font-bold text-slate-100 text-sm">{rank.title}</h4>
                            {rank.minTrophies && (
                              <p className="text-[10px] text-amber-400/90 font-mono">
                                Req: 🏆 {rank.minTrophies} Trophies
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 min-h-[32px]">
                          {rank.description}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80">
                          {isOwned ? (
                            <Badge className="w-full justify-center bg-emerald-950 border-emerald-500/40 text-emerald-300 py-1 text-xs">
                              Owned Title
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseRank(rank.id)}
                              disabled={!meetsTrophies || flixBalance < rank.cost}
                              className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                            >
                              Unlock (⚡ {rank.cost} Flix)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 5: HALL OF LEGENDS — LEADERBOARD & TRIUMVIRATE PODIUM */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="legends" className="space-y-6">
            
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950 p-4 sm:p-5 rounded-3xl border border-amber-500/30 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl shadow-lg border border-amber-300/40">
                  👑
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-100 font-display tracking-tight flex items-center gap-2">
                    <span>The Hall of Immortals</span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono">
                      REAL-TIME COHORT
                    </Badge>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sovereign warrior champions of Orbit LMS ranked by battle trophies, fortified citadels, and knowledge mastery.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Ranking Active</span>
              </div>
            </div>

            {/* ─── TRIUMVIRATE OF LEGENDS (TOP 3 VICTORY PODIUM) ─── */}
            {filteredLeaderboard.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 pb-2">
                
                {/* 🥈 #2 SILVER VANGUARD (Rank 2) */}
                {filteredLeaderboard[1] && (() => {
                  const p2 = filteredLeaderboard[1];
                  const astra = p2.equippedAstraId ? BATTLE_ASTRAS[p2.equippedAstraId] : null;
                  const house = getHouseBadge(p2.house);
                  const isCurrent = p2.studentId === kingdom.studentId;
                  const winRate = p2.battleWins + p2.battleLosses > 0 
                    ? Math.round((p2.battleWins / (p2.battleWins + p2.battleLosses)) * 100) 
                    : 100;

                  return (
                    <div className="order-2 md:order-1 relative rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 p-5 shadow-2xl flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                      {/* Silver Laurel Badge */}
                      <div className="absolute -top-4 w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 border border-white/60 flex items-center justify-center font-black font-mono text-slate-950 text-sm shadow-lg">
                        #2
                      </div>

                      {/* Avatar */}
                      <div className="mt-2 relative">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${house.gradient} p-0.5 shadow-xl`}>
                          <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-lg text-slate-100">
                            {p2.studentName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-sm">{house.icon}</span>
                      </div>

                      <h4 className="font-black text-slate-100 text-base mt-2 flex items-center gap-1.5">
                        <span>{p2.studentName}</span>
                        {isCurrent && <Badge className="bg-amber-500 text-slate-950 text-[9px] px-1 py-0">YOU</Badge>}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">{p2.department || p2.batch || "Candidate"}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${house.gradient}`}>
                          {house.name}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
                          Citadel Lvl {p2.castleLevel + p2.wallLevel + p2.towerLevel}
                        </Badge>
                      </div>

                      {/* Trophies & Stats */}
                      <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Win Record</span>
                          <span className="font-bold text-emerald-400 font-mono">{p2.battleWins}W / {p2.battleLosses}L ({winRate}%)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Trophies</span>
                          <span className="font-black text-amber-300 font-mono text-sm flex items-center justify-end gap-1">
                            🏆 {p2.trophies}
                          </span>
                        </div>
                      </div>

                      {/* Weapon & Action */}
                      <div className="w-full mt-3 flex items-center gap-2">
                        {astra ? (
                          <div className="flex-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-1">
                            <span>{astra.icon}</span>
                            <span className="truncate">{astra.name}</span>
                          </div>
                        ) : (
                          <div className="flex-1 text-[10px] text-slate-600">No Astra</div>
                        )}
                        {!isCurrent && (
                          <Button
                            size="sm"
                            onClick={() => handleInitiateBattle(p2)}
                            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 h-7 rounded-xl"
                          >
                            ⚔️ Duel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 👑 #1 GRAND SOVEREIGN (Rank 1 - Elevated Centerpiece) */}
                {filteredLeaderboard[0] && (() => {
                  const p1 = filteredLeaderboard[0];
                  const astra = p1.equippedAstraId ? BATTLE_ASTRAS[p1.equippedAstraId] : null;
                  const house = getHouseBadge(p1.house);
                  const isCurrent = p1.studentId === kingdom.studentId;
                  const winRate = p1.battleWins + p1.battleLosses > 0 
                    ? Math.round((p1.battleWins / (p1.battleWins + p1.battleLosses)) * 100) 
                    : 100;

                  return (
                    <div className="order-1 md:order-2 relative rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 p-6 shadow-[0_0_40px_rgba(245,158,11,0.25)] flex flex-col items-center text-center transition-transform hover:-translate-y-2 md:-mt-6">
                      {/* Grand Crown & #1 Ribbon */}
                      <div className="absolute -top-6 flex items-center justify-center">
                        <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">👑</span>
                      </div>
                      <div className="absolute -top-3 w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 border-2 border-white flex items-center justify-center font-black font-mono text-slate-950 text-base shadow-xl">
                        #1
                      </div>

                      {/* Golden Radiant Avatar */}
                      <div className="mt-4 relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-600 p-1 shadow-2xl animate-pulse">
                          <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-2xl text-amber-300">
                            {p1.studentName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-base bg-slate-900 border border-amber-400 rounded-full w-6 h-6 flex items-center justify-center shadow">
                          {house.icon}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 shadow">
                          Grand Sovereign
                        </Badge>
                      </div>

                      <h4 className="font-black text-slate-100 text-lg mt-1 flex items-center gap-1.5">
                        <span>{p1.studentName}</span>
                        {isCurrent && <Badge className="bg-amber-500 text-slate-950 text-[10px] px-1 py-0">YOU</Badge>}
                      </h4>
                      <p className="text-xs text-amber-300/90 font-mono">{p1.department || p1.batch || "Grand Master"}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-xs ${house.gradient}`}>
                          {house.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/40 font-mono font-bold">
                          🏰 Citadel Lvl {p1.castleLevel + p1.wallLevel + p1.towerLevel}
                        </Badge>
                      </div>

                      {/* Trophies & Stats */}
                      <div className="w-full mt-3.5 pt-3.5 border-t border-amber-500/30 flex items-center justify-between text-xs">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block uppercase font-mono">Combat Mastery</span>
                          <span className="font-black text-emerald-400 font-mono text-sm">{p1.battleWins}W / {p1.battleLosses}L ({winRate}%)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-mono">Trophies</span>
                          <span className="font-black text-amber-300 font-mono text-base flex items-center justify-end gap-1">
                            🏆 {p1.trophies}
                          </span>
                        </div>
                      </div>

                      {/* Weapon & Action */}
                      <div className="w-full mt-3.5 flex items-center gap-2">
                        {astra ? (
                          <div className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5">
                            <span>{astra.icon}</span>
                            <span className="truncate">{astra.name}</span>
                          </div>
                        ) : (
                          <div className="flex-1 text-xs text-slate-500">No Astra</div>
                        )}
                        {!isCurrent && (
                          <Button
                            size="sm"
                            onClick={() => handleInitiateBattle(p1)}
                            className="text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 px-3.5 h-8 rounded-xl shadow-lg"
                          >
                            ⚔️ Duel King
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 🥉 #3 BRONZE TITAN (Rank 3) */}
                {filteredLeaderboard[2] && (() => {
                  const p3 = filteredLeaderboard[2];
                  const astra = p3.equippedAstraId ? BATTLE_ASTRAS[p3.equippedAstraId] : null;
                  const house = getHouseBadge(p3.house);
                  const isCurrent = p3.studentId === kingdom.studentId;
                  const winRate = p3.battleWins + p3.battleLosses > 0 
                    ? Math.round((p3.battleWins / (p3.battleWins + p3.battleLosses)) * 100) 
                    : 100;

                  return (
                    <div className="order-3 relative rounded-3xl border border-amber-700/60 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 p-5 shadow-2xl flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                      {/* Bronze Laurel Badge */}
                      <div className="absolute -top-4 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-400/60 flex items-center justify-center font-black font-mono text-white text-sm shadow-lg">
                        #3
                      </div>

                      {/* Avatar */}
                      <div className="mt-2 relative">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${house.gradient} p-0.5 shadow-xl`}>
                          <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-lg text-slate-100">
                            {p3.studentName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-sm">{house.icon}</span>
                      </div>

                      <h4 className="font-black text-slate-100 text-base mt-2 flex items-center gap-1.5">
                        <span>{p3.studentName}</span>
                        {isCurrent && <Badge className="bg-amber-500 text-slate-950 text-[9px] px-1 py-0">YOU</Badge>}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">{p3.department || p3.batch || "Protector"}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${house.gradient}`}>
                          {house.name}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
                          Citadel Lvl {p3.castleLevel + p3.wallLevel + p3.towerLevel}
                        </Badge>
                      </div>

                      {/* Trophies & Stats */}
                      <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Win Record</span>
                          <span className="font-bold text-emerald-400 font-mono">{p3.battleWins}W / {p3.battleLosses}L ({winRate}%)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Trophies</span>
                          <span className="font-black text-amber-300 font-mono text-sm flex items-center justify-end gap-1">
                            🏆 {p3.trophies}
                          </span>
                        </div>
                      </div>

                      {/* Weapon & Action */}
                      <div className="w-full mt-3 flex items-center gap-2">
                        {astra ? (
                          <div className="flex-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-1">
                            <span>{astra.icon}</span>
                            <span className="truncate">{astra.name}</span>
                          </div>
                        ) : (
                          <div className="flex-1 text-[10px] text-slate-600">No Astra</div>
                        )}
                        {!isCurrent && (
                          <Button
                            size="sm"
                            onClick={() => handleInitiateBattle(p3)}
                            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 h-7 rounded-xl"
                          >
                            ⚔️ Duel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* ─── FILTER & SEARCH TOOLBAR ─── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={leaderboardFilter === "all" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("all")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "all" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 border-slate-800"
                  }`}
                >
                  🌟 All Champions
                </Button>
                <Button
                  size="sm"
                  variant={leaderboardFilter === "batch" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("batch")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "batch" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 border-slate-800"
                  }`}
                >
                  🎓 My Batch ({kingdom.batch || "Cohort"})
                </Button>
                <Button
                  size="sm"
                  variant={leaderboardFilter === "surya" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("surya")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "surya" ? "bg-amber-500 text-slate-950 shadow-md" : "text-amber-400 border-amber-500/30"
                  }`}
                >
                  ☀️ Surya Clan
                </Button>
                <Button
                  size="sm"
                  variant={leaderboardFilter === "chandra" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("chandra")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "chandra" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-cyan-400 border-cyan-500/30"
                  }`}
                >
                  🌙 Chandra Clan
                </Button>
                <Button
                  size="sm"
                  variant={leaderboardFilter === "vayu" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("vayu")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "vayu" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  🌪️ Vayu Clan
                </Button>
                <Button
                  size="sm"
                  variant={leaderboardFilter === "agni" ? "default" : "outline"}
                  onClick={() => setLeaderboardFilter("agni")}
                  className={`text-xs font-bold rounded-xl transition-all ${
                    leaderboardFilter === "agni" ? "bg-rose-500 text-slate-950 shadow-md" : "text-rose-400 border-rose-500/30"
                  }`}
                >
                  🔥 Agni Clan
                </Button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  placeholder="Search real warrior, course or weapon..."
                  className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-200 rounded-xl w-full lg:w-72 shadow-inner"
                />
              </div>
            </div>

            {/* ─── WARRIORS LEADERBOARD LIST (RANKS 4+) ─── */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pl-1">
                <span>⚔️</span>
                <span>Ascendant Kingdom Cohort ({filteredLeaderboard.length} Scholars)</span>
              </h3>

              <div className="space-y-2.5">
                {filteredLeaderboard.slice(filteredLeaderboard.length >= 3 ? 3 : 0).map((player, idx) => {
                  const rankNum = (filteredLeaderboard.length >= 3 ? 3 : 0) + idx + 1;
                  const isCurrent = player.studentId === kingdom.studentId;
                  const playerAstra = player.equippedAstraId ? BATTLE_ASTRAS[player.equippedAstraId] : null;
                  const house = getHouseBadge(player.house);
                  const winRate = player.battleWins + player.battleLosses > 0 
                    ? Math.round((player.battleWins / (player.battleWins + player.battleLosses)) * 100) 
                    : 100;

                  return (
                    <div
                      key={player.studentId}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 flex flex-wrap items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-amber-500/10 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          : "bg-slate-900/70 border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/90 hover:shadow-lg"
                      }`}
                    >
                      {/* Left: Rank, Avatar & Warrior Identity */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-xs shadow-md shrink-0 ${
                            rankNum <= 5
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-400/40"
                              : rankNum <= 10
                              ? "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 border border-slate-600/40"
                              : "bg-slate-950 text-slate-500 border border-slate-800"
                          }`}
                        >
                          #{rankNum}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${house.gradient} p-0.5 shadow-md`}>
                            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-bold text-sm text-slate-200">
                              {player.studentName.slice(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <span className="absolute -bottom-1 -right-1 text-xs">{house.icon}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-sm sm:text-base">
                              {player.studentName}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0 h-4 font-black">
                                YOU
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${house.gradient}`}>
                              {house.name}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-slate-300 font-medium">{player.department || player.batch || "Student Warrior"}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-mono font-semibold">Citadel Lvl {player.castleLevel + player.wallLevel + player.towerLevel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Astra, Combat Win Rate, Trophies & Challenge Action */}
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 text-xs font-mono w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-t-0">
                        {playerAstra ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 shadow-inner">
                            <span className="text-sm">{playerAstra.icon}</span>
                            <span className="text-slate-300 font-sans font-semibold text-xs">{playerAstra.name}</span>
                          </div>
                        ) : (
                          <span className="hidden sm:inline text-slate-600 font-sans text-xs">No Astra</span>
                        )}

                        <div className="text-right">
                          <div className="text-emerald-400 font-bold text-xs">
                            {player.battleWins} Wins ({winRate}%)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {player.battleWins + player.battleLosses} Fought
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-amber-400 font-black text-sm sm:text-base flex items-center justify-end gap-1">
                            🏆 {player.trophies}
                          </div>
                          <div className="text-[10px] text-slate-500">Trophies</div>
                        </div>

                        {!isCurrent && (
                          <Button
                            size="sm"
                            onClick={() => handleInitiateBattle(player)}
                            className="text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 px-3.5 h-8 rounded-xl transition-all shadow"
                          >
                            ⚔️ Duel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </TabsContent>
        </Tabs>

        {/* ─── MODALS ─── */}
        <BuildingUpgradeModal
          type={selectedStructure}
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          kingdom={kingdom}
          onUpgradeSuccess={(updated) => setKingdom(updated)}
        />

        <BattleArenaModal
          defender={battleDefender}
          attacker={kingdom}
          isOpen={battleModalOpen}
          onClose={() => setBattleModalOpen(false)}
          onBattleFinished={() => {
            setKingdom(getStudentKingdom());
            setFlixBalanceState(getFluxBalance());
            setBattleLogs(getBattleLogs());
            setOpponents(getEligibleOpponents());
          }}
        />

      </div>
    </StudentLayout>
  );
}
