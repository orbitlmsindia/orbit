import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Menu, User, Command, Sparkles, Award, Trophy, X, CheckCheck, Trash2, GraduationCap, FileText, CheckCircle2, Ticket } from "lucide-react";
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
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
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
    <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2">
      {/* Left section: Sidebar trigger & Mobile Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

      {/* Center Search Bar - Full on sm+, compact icon button on mobile */}
      <div className="flex-1 max-w-md mx-1 sm:mx-4">
        <button
          type="button"
          onClick={() => setSpotlightOpen(true)}
          className="w-full h-9 px-2.5 sm:px-3 rounded-lg border border-input bg-muted/30 text-muted-foreground text-xs flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline truncate">Search courses, students, settings...</span>
            <span className="sm:hidden text-xs truncate">Search...</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] bg-background border px-1.5 py-0.5 rounded">⌘G</span>
        </button>
      </div>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Gamified Aura Points & Credits Navbar Ledger Pill */}
        <button
          type="button"
          onClick={() => setLedgerSheetOpen(true)}
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-full border bg-muted/40 hover:bg-muted/70 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-xs font-mono font-semibold shadow-xs"
          title="Click to view Gamified Ledger & Credits"
        >
          <span className="text-amber-500 font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
            <span>{auraPoints}</span>
          </span>
          <span className="text-muted-foreground text-[10px]">•</span>
          <span className="text-primary font-bold flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{totalCredits}</span>
          </span>
        </button>
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-accent rounded-full h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 max-w-sm p-0 rounded-2xl shadow-xl border border-border bg-card overflow-hidden">

            <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Read All
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Custom styled scroll area (no standard browser scrollbar arrows/track) */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/60 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">No notifications yet</p>
                  <p className="text-[11px] text-muted-foreground/70">You will be notified when events or enrollments occur.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const titleLower = (n.title || '').toLowerCase();
                  let IconComponent = Bell;
                  let iconColor = "text-primary bg-primary/10";
                  if (titleLower.includes('enrollment')) {
                    IconComponent = GraduationCap;
                    iconColor = "text-emerald-600 bg-emerald-500/10";
                  } else if (titleLower.includes('submission') || titleLower.includes('assignment') || titleLower.includes('quiz')) {
                    IconComponent = FileText;
                    iconColor = "text-purple-600 bg-purple-500/10";
                  } else if (titleLower.includes('coupon')) {
                    IconComponent = Ticket;
                    iconColor = "text-amber-600 bg-amber-500/10";
                  }

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 transition-all duration-200 cursor-pointer flex items-start gap-3 relative group ${
                        !n.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-xs text-foreground truncate">{n.title}</h4>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                        {n.created_at && (
                          <p className="text-[10px] font-mono text-muted-foreground/70 pt-0.5">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      {/* Delete (Cross X) Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="h-6 w-6 rounded-full opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground absolute top-3 right-3 transition-opacity"
                        title="Delete notification"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
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
