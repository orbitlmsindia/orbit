import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  User,
  Mail,
  Shield,
  Save,
  Sparkles,
  Award,
  Flame,
  Zap,
  Palette,
  CheckCircle2,
  Lock,
  Crown,
  ArrowLeft,
  Gift,
  ShieldCheck,
  Check,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import {
  getStudentProfileThemeData,
  StudentProfileThemeData,
  claimDailyFlux,
  purchaseTheme
} from "@/services/themeService";
import { THEMES_CATALOG, ThemeCatalogItem } from "@/types/theme";
import { useTheme } from "@/components/theme-provider";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";

export default function Profile() {
  const navigate = useNavigate();
  const { id: paramUserId } = useParams<{ id?: string }>();
  const { setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);
  const [viewerRole, setViewerRole] = useState<string>("student");

  // Profile data
  const [targetUser, setTargetUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [auraPoints, setAuraPoints] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);

  // Theme intelligence
  const [themeData, setThemeData] = useState<StudentProfileThemeData | null>(null);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const isSelf = !paramUserId || (currentAuthUser && paramUserId === currentAuthUser.id);

  useEffect(() => {
    loadProfileData();
  }, [paramUserId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentAuthUser(user);

      // Fetch viewer's own role for layout rendering
      const { data: viewerProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (viewerProfile?.role) {
        setViewerRole(viewerProfile.role);
      }

      const effectiveUserId = paramUserId || user.id;

      // 1. Fetch target user's details
      const { data: targetData, error: targetErr } = await supabase
        .from("users")
        .select(
          "id, role, full_name, avatar_url, email, bio, aura_points, bonus_credits, current_streak, highest_streak, created_at"
        )
        .eq("id", effectiveUserId)
        .single();

      if (targetErr || !targetData) {
        throw targetErr || new Error("User profile not found.");
      }

      setTargetUser(targetData);
      setFullName(targetData.full_name || "");
      setBio(targetData.bio || "");
      setCurrentStreak(targetData.current_streak || 0);
      setHighestStreak(targetData.highest_streak || targetData.current_streak || 0);

      // 2. Compute academic credits
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("status, completed, course:courses(credit_points)")
        .eq("student_id", effectiveUserId)
        .eq("status", "approved")
        .eq("completed", true);

      const courseCredits = (enrollments || []).reduce((sum: number, e: any) => {
        const creds = Array.isArray(e.course)
          ? e.course[0]?.credit_points
          : e.course?.credit_points;
        return sum + (creds || 3);
      }, 0);

      const computedCredits = courseCredits + (targetData.bonus_credits || 0);
      setTotalCredits(computedCredits);

      // 3. Compute derived Aura points
      const { data: compSections } = await supabase
        .from("section_progress")
        .select("id")
        .eq("user_id", effectiveUserId)
        .eq("completed", true);

      const sectionAura = (compSections || []).length * 10;

      const { data: subs } = await supabase
        .from("submissions")
        .select("grade")
        .eq("student_id", effectiveUserId)
        .eq("status", "graded");

      const subAura = (subs || []).reduce(
        (acc: number, s: any) => acc + (s.grade || 0),
        0
      );

      const computedAura =
        (targetData.aura_points || 0) + sectionAura + subAura;
      setAuraPoints(computedAura);

      // 4. Calculate theme & purchasing readiness intelligence
      const themeIntel = getStudentProfileThemeData(
        effectiveUserId,
        user.id,
        computedAura,
        computedCredits,
        targetData.role
      );
      setThemeData(themeIntel);
    } catch (err: any) {
      console.error("Error loading profile:", err);
      toast.error(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAuthUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName, bio: bio })
        .eq("id", currentAuthUser.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      toast.success("Profile details updated successfully! 🎉");
      setTargetUser({ ...targetUser, full_name: fullName, bio: bio });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !currentAuthUser) return;

      setSaving(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentAuthUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", currentAuthUser.id);

      if (updateError) throw updateError;

      setTargetUser({ ...targetUser, avatar_url: publicUrl });
      toast.success("Profile avatar image updated successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  const handleClaimFlux = () => {
    const res = claimDailyFlux(10);
    if (!res.success) {
      toast.error(res.message || "Daily Orbit Flux already claimed today (max 10 ⚡ daily).");
      return;
    }
    toast.success(`⚡ +10 Orbit Flux Claimed! Balance: ⚡ ${res.newBalance} Flux.`);
    if (themeData) {
      setThemeData({
        ...themeData,
        fluxBalance: res.newBalance,
        affordableThemes: THEMES_CATALOG.filter(
          (t) =>
            !themeData.unlockedThemes.some((u) => u.id === t.id) &&
            t.cost > 0 &&
            t.cost <= res.newBalance
        ),
        upcomingThemes: THEMES_CATALOG.filter(
          (t) =>
            !themeData.unlockedThemes.some((u) => u.id === t.id) &&
            t.cost > res.newBalance
        ).map((t) => ({ theme: t, fluxNeeded: t.cost - res.newBalance })),
      });
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${targetUser?.id || currentAuthUser?.id}`;
    const name = targetUser?.full_name || fullName || "Orbit Scholar";
    const text = `Explore ${name}'s verified scholar profile on Orbit LMS! ✨ Aura: ${auraPoints}, 🎓 Credits: ${totalCredits}.`;

    if (navigator.share) {
      navigator.share({
        title: `${name} - Orbit LMS Scholar Profile`,
        text,
        url: profileUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Profile Link Copied! 📋 Share with friends and recruiters.");
    }
  };

  const handleUnlockAndEquip = (themeItem: ThemeCatalogItem) => {
    setUnlockingId(themeItem.id);
    const result = purchaseTheme(themeItem.id, targetUser?.role);
    setUnlockingId(null);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setTheme(themeItem.id);
    toast.success(result.message);

    // Refresh theme intel
    if (currentAuthUser && targetUser) {
      const updated = getStudentProfileThemeData(
        targetUser.id,
        currentAuthUser.id,
        auraPoints,
        totalCredits,
        targetUser.role
      );
      setThemeData(updated);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ProfileContent = () => (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isSelf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground touch-press"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold">
            {isSelf ? "My Profile & Theme Wallet" : `${targetUser?.full_name}'s Public Profile`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={handleShareProfile}
            className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs gap-1.5 shadow-2xs cursor-pointer touch-press"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Profile</span>
          </Button>

          <Button
            onClick={() => setThemeStudioOpen(true)}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-sm cursor-pointer touch-press"
          >
            <Palette className="h-4 w-4" />
            <span>Orbit Theme Studio</span>
          </Button>
        </div>
      </div>

      {/* Gamified Points & Flux Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Aura Points */}
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-2xs">
          <CardContent className="p-3 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Aura Points</span>
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/30" />
            </div>
            <div className="mt-2.5 sm:mt-3">
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-500">
                {auraPoints}
              </p>
              <span className="text-[11px] text-amber-600/80 font-medium">
                {auraPoints >= 200
                  ? "💎 Orbit Legend"
                  : auraPoints >= 100
                  ? "🔥 Aura Master"
                  : auraPoints >= 50
                  ? "⚡ Aura Rising"
                  : "✨ Aura Novice"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Academic Credits */}
        <Card className="border-primary/20 bg-primary/5 shadow-2xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Academic Credits</span>
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-primary">
                {totalCredits}
              </p>
              <span className="text-[11px] text-muted-foreground font-medium">
                {totalCredits >= 12 ? "🎓 Placement Priority" : "Degree Progress"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Streak */}
        <Card className="border-orange-500/20 bg-orange-500/5 shadow-2xs">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Learning Streak</span>
              <Flame className="h-4 w-4 text-orange-500 fill-orange-500/30" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-mono text-orange-500">
                {currentStreak} <span className="text-xs font-sans">Days</span>
              </p>
              <span className="text-[11px] text-muted-foreground font-medium">
                Highest: {highestStreak} Days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Orbit Flux Points Wallet */}
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-amber-500/5 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-bold">Orbit Flux</span>
              <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-1">
              <div>
                <p className="text-2xl font-bold font-mono text-foreground flex items-center gap-1">
                  <span>{themeData?.fluxBalance.toLocaleString()}</span>
                  <span className="text-xs text-amber-500 font-sans">FLUX</span>
                </p>
                <span className="text-[10px] text-amber-500 font-bold">
                  Theme Currency
                </span>
              </div>
              {isSelf && (
                <Button
                  size="sm"
                  onClick={handleClaimFlux}
                  className="h-7 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg gap-1 shadow-xs cursor-pointer"
                >
                  <Gift className="h-3 w-3" /> +250
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Student Identity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 pt-2">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-muted shadow-md">
                <AvatarImage src={targetUser?.avatar_url} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {fullName
                    ? fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              {isSelf && (
                <>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    <span className="text-xs font-semibold">Change Photo</span>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={saving}
                  />
                </>
              )}
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
              <p className="text-xs text-muted-foreground font-mono">{targetUser?.email}</p>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Badge variant="outline" className="text-[10px] font-mono capitalize">
                  {targetUser?.role || "student"}
                </Badge>
                <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-600/20 text-[10px] font-sans">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" /> Verified
                </Badge>
              </div>
            </div>

            {/* Bio info */}
            <div className="w-full pt-3 border-t text-left space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                About Student
              </span>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {bio || "Dedicated Orbit scholar passionate about coding and technology."}
              </p>
            </div>
          </CardContent>

          {isSelf && (
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="pt-0 space-y-3 border-t">
                <div className="space-y-1 pt-3">
                  <Label htmlFor="fullname" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-8 text-xs"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bio" className="text-xs font-semibold">
                    Bio & Learning Philosophy
                  </Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Brief intro..."
                    disabled={saving}
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t flex justify-end">
                <Button size="sm" type="submit" disabled={saving} className="h-8 text-xs gap-1.5 font-bold">
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" /> Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Right Column: Theme Showcase & Purchaseable Themes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Signature Theme Showcase */}
          {themeData && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    {isSelf ? "Your Active Theme" : `${targetUser?.full_name}'s Equipped Theme`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current aesthetic signature transforming all layout elements.
                  </CardDescription>
                </div>
                <Badge
                  className="text-[9px] font-mono uppercase"
                  style={{
                    background: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6",
                    color: themeData.equippedTheme?.isDark ? "#ffffff" : "#000000",
                  }}
                >
                  {themeData.equippedTheme?.badge || "THEME"}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <div
                  className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-inner border border-white/10"
                  style={{ background: themeData.equippedTheme?.palette?.background || themeData.equippedTheme?.bgColor || "#0f172a" }}
                >
                  <div className="flex items-center gap-4 z-10">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 shrink-0"
                      style={{
                        background: themeData.equippedTheme?.palette?.card || "#1e293b",
                        color: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6",
                      }}
                    >
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <div>
                      <h4
                        className="text-lg font-bold tracking-tight"
                        style={{ color: themeData.equippedTheme?.palette?.foreground || "#f8fafc" }}
                      >
                        {themeData.equippedTheme?.name || "Equipped Theme"}
                      </h4>
                      <p
                        className="text-xs opacity-80 pt-0.5 max-w-sm line-clamp-2"
                        style={{ color: themeData.equippedTheme?.palette?.foreground || "#f8fafc" }}
                      >
                        {themeData.equippedTheme?.description || ""}
                      </p>
                    </div>
                  </div>

                  {/* Swatches */}
                  <div className="flex items-center gap-2 z-10 shrink-0">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/40 border border-white/10">
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: themeData.equippedTheme?.palette?.background || themeData.equippedTheme?.bgColor || "#0f172a" }}
                        title="Background"
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: themeData.equippedTheme?.palette?.card || "#1e293b" }}
                        title="Card Surface"
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6" }}
                        title="Primary"
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: themeData.equippedTheme?.palette?.accent || "#60a5fa" }}
                        title="Accent"
                      />
                    </div>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-1.5"
                    style={{ background: themeData.equippedTheme?.previewGradient || "linear-gradient(to right, #3b82f6, #60a5fa)" }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Themes This Student Can Purchase with Current Points/Flux */}
          {themeData && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                    {isSelf
                      ? "Themes You Can Purchase Right Now"
                      : `Themes ${targetUser?.full_name} Can Purchase`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Available in catalog matching current balance of ⚡{" "}
                    <span className="font-bold text-foreground">
                      {themeData.fluxBalance.toLocaleString()} Flux
                    </span>
                    .
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono border-amber-500/40 text-amber-500 bg-amber-500/10 self-start sm:self-auto"
                >
                  {themeData.affordableThemes.length} Affordable
                </Badge>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {themeData.affordableThemes.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      All themes matching this wallet tier have already been unlocked!
                    </p>
                    {isSelf && (
                      <Button
                        size="sm"
                        onClick={handleClaimFlux}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer"
                      >
                        <Gift className="h-3.5 w-3.5" /> Claim +250 Flux for Higher Tiers
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {themeData.affordableThemes.map((themeItem) => (
                      <div
                        key={themeItem.id}
                        className="p-3.5 rounded-xl border border-border bg-card hover:border-amber-500/50 hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-10 w-10 rounded-xl border border-white/20 flex items-center justify-center shrink-0 shadow-xs"
                            style={{ background: themeItem.palette?.background || themeItem.bgColor || "#0f172a" }}
                          >
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{ background: themeItem.palette?.primary || themeItem.primaryColor || "#3b82f6" }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className="font-bold text-xs text-foreground truncate">
                                {themeItem.name}
                              </h5>
                              <Badge
                                variant="outline"
                                className="text-[8px] font-mono py-0 px-1 border-primary/30 text-primary"
                              >
                                {themeItem.badge}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-amber-500 font-bold flex items-center gap-1 pt-0.5">
                              <Zap className="h-3 w-3 fill-amber-500" /> ⚡ {themeItem.cost} FLUX
                              <span className="text-[10px] text-emerald-500 font-sans font-semibold">
                                • Within Reach
                              </span>
                            </p>
                          </div>
                        </div>

                        {isSelf ? (
                          <Button
                            size="sm"
                            onClick={() => handleUnlockAndEquip(themeItem)}
                            disabled={unlockingId === themeItem.id}
                            className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>
                              {unlockingId === themeItem.id ? "Unlocking..." : "Unlock"}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setThemeStudioOpen(true)}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 shrink-0 gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming Higher Tier Milestones */}
                {themeData.upcomingThemes.length > 0 && (
                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <h6 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                      Next Milestone Tier Unlocks
                    </h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {themeData.upcomingThemes.slice(0, 4).map(({ theme: tItem, fluxNeeded }) => (
                        <div
                          key={tItem.id}
                          className="p-2.5 rounded-xl border border-muted bg-muted/20 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ background: tItem.palette.primary }}
                            />
                            <span className="font-semibold text-foreground truncate">
                              {tItem.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                            Need ⚡{" "}
                            <span className="font-bold text-amber-500">{fluxNeeded}</span> more
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Orbit Theme Studio Modal Trigger */}
      <ThemeStudioModal
        open={themeStudioOpen}
        onOpenChange={setThemeStudioOpen}
        userRole={targetUser?.role}
      />
    </div>
  );

  // Wrap in appropriate layout based on viewer's role
  if (viewerRole === "admin" || viewerRole === "super_admin") {
    return (
      <AdminLayout>
        <ProfileContent />
      </AdminLayout>
    );
  } else if (viewerRole === "teacher") {
    return (
      <TeacherLayout>
        <ProfileContent />
      </TeacherLayout>
    );
  } else {
    return (
      <StudentLayout>
        <ProfileContent />
      </StudentLayout>
    );
  }
}
