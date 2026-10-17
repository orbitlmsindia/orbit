import React, { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Shield,
  Swords,
  Zap,
  Sparkles,
  Search,
  Crown,
  Flame,
  Award,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Gift
} from "lucide-react";
import { WEAPONS_CATALOG, AstraWeapon, WeaponCategory, WeaponRarity } from "@/types/weapon";
import {
  getOwnedWeapons,
  getEquippedWeapon,
  equipWeapon,
  purchaseWeapon,
  isWeaponOwned
} from "@/services/weaponService";
import { getFluxBalance, claimDailyFlux, hasClaimedFluxToday } from "@/services/themeService";
import { WeaponVisualCard } from "@/components/weapon/WeaponVisualCard";
import { WeaponDetailModal } from "@/components/weapon/WeaponDetailModal";
import { triggerConfetti } from "@/lib/confetti";
import { supabase } from "@/lib/supabase";

export default function StudentArmory() {
  const { toast } = useToast();
  const [fluxBalance, setFluxBalanceState] = useState<number>(getFluxBalance());
  const [ownedWeapons, setOwnedWeapons] = useState<string[]>(getOwnedWeapons());
  const [equippedWeapon, setEquippedWeaponState] = useState<AstraWeapon>(getEquippedWeapon());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedInspectWeapon, setSelectedInspectWeapon] = useState<AstraWeapon | null>(null);

  // Load current auth user and sync balances
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setEquippedWeaponState(getEquippedWeapon(user.id));
      }
    }
    loadUser();

    const handleFluxUpdate = (e: any) => {
      setFluxBalanceState(e.detail ?? getFluxBalance());
    };
    const handleWeaponEquip = (e: any) => {
      if (e.detail) setEquippedWeaponState(e.detail);
    };

    window.addEventListener("orbit_flux_updated", handleFluxUpdate);
    window.addEventListener("orbit_weapon_equipped", handleWeaponEquip);

    return () => {
      window.removeEventListener("orbit_flux_updated", handleFluxUpdate);
      window.removeEventListener("orbit_weapon_equipped", handleWeaponEquip);
    };
  }, []);

  const handleClaimDaily = () => {
    const result = claimDailyFlux();
    setFluxBalanceState(result.newBalance);
    if (result.success) {
      triggerConfetti({ particleCount: 50 });
      toast({
        title: "Daily Flux Claimed! ⚡",
        description: result.message
      });
    } else {
      toast({
        variant: "destructive",
        title: "Daily Limit Reached",
        description: result.message
      });
    }
  };

  const handleEquip = (weapon: AstraWeapon) => {
    const res = equipWeapon(weapon.id, currentUserId || undefined);
    if (res.success && res.weapon) {
      setEquippedWeaponState(res.weapon);
      triggerConfetti({ particleCount: 40 });
      toast({
        title: "Astra Wielded! 🔱",
        description: res.message
      });
    } else {
      toast({
        variant: "destructive",
        title: "Could not equip",
        description: res.message
      });
    }
  };

  const handlePurchase = (weapon: AstraWeapon) => {
    const res = purchaseWeapon(weapon.id, currentUserId || undefined);
    if (res.success && res.weapon) {
      setFluxBalanceState(res.remainingFlux);
      setOwnedWeapons(getOwnedWeapons());
      setEquippedWeaponState(res.weapon);
      triggerConfetti({ particleCount: 80, spread: 70 });
      toast({
        title: "Weapon Unlocked! ✨",
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

  const handleInspect = (weapon: AstraWeapon) => {
    setSelectedInspectWeapon(weapon);
    setInspectModalOpen(true);
  };

  // Filter Catalog
  const filteredWeapons = WEAPONS_CATALOG.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.sanskritName.includes(searchQuery) ||
      w.lore.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.passiveBuff.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.wielders.some(person => person.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || w.category === selectedCategory;
    const matchesRarity = selectedRarity === "all" || w.rarity === selectedRarity;
    const matchesOwned = !filterOwnedOnly || ownedWeapons.includes(w.id);

    return matchesSearch && matchesCategory && matchesRarity && matchesOwned;
  });

  const categories = [
    { id: "all", label: `All Arsenal (${WEAPONS_CATALOG.length})` },
    { id: "divyastra", label: "Divyastras (Celestial Missiles)" },
    { id: "shastra", label: "Sacred Shastras (Blades & Relics)" },
    { id: "dhanush_bana", label: "Dhanush & Nano-Banas" },
    { id: "cyber_astra", label: "Cyber-Astras & Plasma Blasters" },
  ];

  const rarities = ["all", "divine", "supreme", "mythic", "celestial", "legendary"];

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-24 animate-in fade-in duration-300">
        {/* Top Header & Flux Balance Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Swords className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground">
                    Shastra-Shala • Celestial Armory
                  </h1>
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-mono">
                    Ancient Epics & Nano-Tech
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Unlock divine Astras, mythical Shastras, and futuristic Nano-Banas from ancient Indian history using Orbit Flux.
                </p>
              </div>
            </div>
          </div>

          {/* Flux Wallet Card */}
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border/80 self-start md:self-auto shadow-xs">
            <div className="flex items-center gap-2.5 pr-2 border-r border-border/60">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Zap className="h-5 w-5 fill-amber-500" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Orbit Flux Balance
                </span>
                <span className="text-lg font-black font-mono text-foreground flex items-center gap-1">
                  ⚡ {fluxBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleClaimDaily}
              disabled={hasClaimedFluxToday()}
              className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl gap-1 shadow-xs"
            >
              <Gift className="h-3.5 w-3.5" />
              {hasClaimedFluxToday() ? "Claimed Today" : "+10 Daily Flux"}
            </Button>
          </div>
        </div>

        {/* Hero Banner: Currently Wielded Weapon */}
        {equippedWeapon && (
          <Card
            className="border overflow-hidden relative shadow-lg"
            style={{
              borderColor: `${equippedWeapon.glowColor}50`,
              boxShadow: `0 0 30px ${equippedWeapon.glowColor}20`,
            }}
          >
            <div className={`h-2.5 bg-gradient-to-r ${equippedWeapon.gradient}`} />
            <CardContent className="p-5 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-card border-2 flex items-center justify-center text-4xl sm:text-5xl shadow-xl shrink-0 group relative overflow-hidden"
                  style={{
                    borderColor: equippedWeapon.glowColor,
                    boxShadow: `0 0 25px ${equippedWeapon.glowColor}40`,
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${equippedWeapon.gradient} opacity-20`} />
                  <span className="relative z-10">{equippedWeapon.icon}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider gap-1">
                      <Crown className="h-3 w-3 fill-slate-950" /> ACTIVELY WIELDED ASTRA
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono border-primary/30">
                      {equippedWeapon.rarity}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {equippedWeapon.category.replace('_', ' ')}
                    </Badge>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                    {equippedWeapon.name}{" "}
                    <span className="text-base sm:text-lg font-serif font-bold text-amber-600 dark:text-amber-400">
                      ({equippedWeapon.sanskritName})
                    </span>
                  </h2>

                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed">
                    {equippedWeapon.lore}
                  </p>

                  <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-primary">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Active Perk: {equippedWeapon.passiveBuff}</span>
                  </div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInspect(equippedWeapon)}
                  className="text-xs h-9 gap-1.5 rounded-xl flex-1 lg:flex-none"
                >
                  Inspect Lore & Stats
                </Button>
                <Link to="/profile" className="flex-1 lg:flex-none">
                  <Button
                    size="sm"
                    className="text-xs h-9 gap-1.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                  >
                    View on Profile <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link to="/student/leaderboard" className="flex-1 lg:flex-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-9 gap-1.5 rounded-xl w-full text-muted-foreground hover:text-foreground"
                  >
                    See on Leaderboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Search Toolbar */}
        <div className="space-y-3">
          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {categories.map(c => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedCategory === c.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(c.id)}
                className={`h-8 text-xs font-semibold shrink-0 rounded-xl px-3 ${
                  selectedCategory === c.id ? "bg-primary text-primary-foreground shadow-xs" : ""
                }`}
              >
                {c.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search weapons, Arjuna, Shiva, Trishula, Nano-Bana..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Rarity & Owned filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/60">
                {rarities.map(r => (
                  <Button
                    key={r}
                    size="sm"
                    variant={selectedRarity === r ? "secondary" : "ghost"}
                    onClick={() => setSelectedRarity(r)}
                    className="h-7 text-[11px] capitalize px-2 font-mono rounded-lg"
                  >
                    {r}
                  </Button>
                ))}
              </div>

              <Button
                size="sm"
                variant={filterOwnedOnly ? "default" : "outline"}
                onClick={() => setFilterOwnedOnly(!filterOwnedOnly)}
                className="h-8 text-xs font-semibold rounded-xl gap-1 shrink-0"
              >
                <Shield className="h-3.5 w-3.5" />
                {filterOwnedOnly ? "Showing Owned" : "My Arsenal"}
              </Button>
            </div>
          </div>
        </div>

        {/* Weapons Grid */}
        {filteredWeapons.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-border bg-card/40 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <Swords className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Astras Found Matching Filters</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query, selecting "All Arsenal", or clearing the rarity filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedRarity("all");
                setFilterOwnedOnly(false);
              }}
              className="text-xs rounded-xl"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredWeapons.map(weapon => {
              const isOwned = ownedWeapons.includes(weapon.id);
              const isEquipped = equippedWeapon?.id === weapon.id;

              return (
                <WeaponVisualCard
                  key={weapon.id}
                  weapon={weapon}
                  isOwned={isOwned}
                  isEquipped={isEquipped}
                  userFlux={fluxBalance}
                  onEquip={handleEquip}
                  onPurchase={handlePurchase}
                  onInspect={handleInspect}
                />
              );
            })}
          </div>
        )}

        {/* Modal Inspector */}
        <WeaponDetailModal
          weapon={selectedInspectWeapon}
          open={inspectModalOpen}
          onOpenChange={setInspectModalOpen}
          isOwned={selectedInspectWeapon ? ownedWeapons.includes(selectedInspectWeapon.id) : false}
          isEquipped={selectedInspectWeapon?.id === equippedWeapon?.id}
          userFlux={fluxBalance}
          onEquip={handleEquip}
          onPurchase={handlePurchase}
        />
      </div>
    </StudentLayout>
  );
}
