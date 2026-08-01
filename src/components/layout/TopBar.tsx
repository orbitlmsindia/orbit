import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Menu, User, Command, Sparkles, Award, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/contexts/NotificationContext";
import { SpotlightSearch } from "@/components/search/SpotlightSearch";
import { JsonCalendarUpdaterModal } from "@/components/calendar/JsonCalendarUpdaterModal";
import { AuraLedgerSheet } from "@/components/ledger/AuraLedgerSheet";

interface TopBarProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  notificationCount?: number;
}

export function TopBar({
  userName: initialUserName = "User",
  userEmail: initialUserEmail = "",
  userAvatar,
  notificationCount: initialNotificationCount = 0,
}: TopBarProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [name, setName] = useState(initialUserName);
  const [email, setEmail] = useState(initialUserEmail);
  const [avatar, setAvatar] = useState(userAvatar);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [auraPoints, setAuraPoints] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [userRole, setUserRole] = useState("student");
  const [ledgerSheetOpen, setLedgerSheetOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metaName = user.user_metadata?.full_name;
        const metaEmail = user.email;

        if (metaName) setName(metaName);
        if (metaEmail) setEmail(metaEmail);

        const { data: profile } = await supabase
          .from('users')
          .select('full_name, email, avatar_url, aura_points, bonus_credits, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setName(profile.full_name || metaName || "User");
          setEmail(profile.email || metaEmail || "");
          if (profile.avatar_url) setAvatar(profile.avatar_url);
          if (profile.role) setUserRole(profile.role);

          const { data: enrs } = await supabase
            .from("enrollments")
            .select("status, completed, course:courses(credit_points)")
            .eq("student_id", user.id)
            .eq("status", "approved")
            .eq("completed", true);

          const courseCredits = (enrs || []).reduce((sum, e) => {
            const creds = Array.isArray(e.course) ? e.course[0]?.credit_points : e.course?.credit_points;
            return sum + (creds || 3);
          }, 0);

          const computedCredits = courseCredits + (profile.bonus_credits || 0);

          const { data: compSections } = await supabase
            .from("section_progress")
            .select("id")
            .eq("user_id", user.id)
            .eq("completed", true);

          const sectionAura = (compSections || []).length * 10; // +10 Aura per completed lesson session

          const { data: subs } = await supabase
            .from("submissions")
            .select("grade")
            .eq("student_id", user.id)
            .eq("status", "graded");

          const subAura = (subs || []).reduce((acc, s) => acc + (s.grade || 0), 0);

          // Total Aura = base DB points + completed sessions + graded assignments (NO points for just joining)
          setAuraPoints((profile.aura_points || 0) + sectionAura + subAura);
          setTotalCredits(computedCredits);
        }
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
  };

  return (
    <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Left section: Sidebar trigger & Mobile Menu */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden md:flex items-center gap-2 text-muted-foreground text-xs">
          <span>Press</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>G
          </kbd>
          <span>for Spotlight Search or</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span>for JSON Schedule</span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <button
          type="button"
          onClick={() => setSpotlightOpen(true)}
          className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-muted-foreground text-xs flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search courses, students, settings...</span>
          </span>
          <span className="font-mono text-[10px] bg-background border px-1.5 py-0.5 rounded">⌘G</span>
        </button>
      </div>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Gamified Aura Points & Credits Navbar Ledger Pill */}
        <button
          type="button"
          onClick={() => setLedgerSheetOpen(true)}
          className="h-9 px-3 rounded-full border bg-muted/40 hover:bg-muted/70 transition-all flex items-center gap-2 cursor-pointer text-xs font-mono font-semibold shadow-xs"
          title="Click to view Gamified Ledger & Credits"
        >
          <span className="text-amber-500 font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> ✨ {auraPoints}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary font-bold flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-primary" /> 🎓 {totalCredits}
          </span>
        </button>
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px] rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-primary font-normal">{unreadCount} unread</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No notifications</div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="p-3 cursor-pointer flex flex-col items-start gap-1"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{n.title}</span>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />
      <JsonCalendarUpdaterModal />
      <AuraLedgerSheet open={ledgerSheetOpen} onOpenChange={setLedgerSheetOpen} userRole={userRole} />
    </header>
  );
}
