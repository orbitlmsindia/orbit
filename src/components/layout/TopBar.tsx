import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Menu, User, Command, Sparkles, Award, Trophy, X, CheckCheck, Trash2, GraduationCap, FileText, CheckCircle2, Ticket, Palette, Zap } from "lucide-react";
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
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";
import { getFluxBalance } from "@/services/themeService";

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
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [fluxBalance, setFluxBalance] = useState<number>(() => getFluxBalance());

  useEffect(() => {
    const handleFluxUpdate = (e: any) => {
      setFluxBalance(e?.detail ?? getFluxBalance());
    };
    window.addEventListener("orbit_flux_updated", handleFluxUpdate);
    return () => window.removeEventListener("orbit_flux_updated", handleFluxUpdate);
  }, []);

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

    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '');
    
    // 0. Billing / Purchasing / Renewal reminder notification -> Navigate to /admin/billing
    if (
      notif.notification_type === 'billing' ||
      notif.notification_type === 'invoice' ||
      title.includes('billing') ||
      title.includes('renewal') ||
      title.includes('purchase') ||
      title.includes('invoice') ||
      title.includes('reminder from master admin') ||
      msg.toLowerCase().includes('master admin')
    ) {
      if (userRole === 'admin' || userRole === 'super_admin') {
        navigate('/admin/billing');
        return;
      }
    }

    // 1. Enrollment notification -> Navigate to teacher/admin student verification tab
    if (notif.notification_type === 'enrollment' || title.includes('enrollment') || msg.includes('enrolled')) {
      if (notif.course_id) {
        if (userRole === 'teacher') {
          navigate(`/teacher/courses/${notif.course_id}?tab=students`);
          return;
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          navigate(`/admin/courses/${notif.course_id}?tab=curriculum`);
          return;
        }
      }

      // If course_id is not directly on notification object, try finding matching course from message
      if (userRole === 'teacher') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: myCourses } = await supabase
              .from('courses')
              .select('id, title')
              .eq('teacher_id', user.id);
            
            const matched = myCourses?.find(c => msg.toLowerCase().includes(c.title.toLowerCase()));
            if (matched) {
              navigate(`/teacher/courses/${matched.id}?tab=students`);
              return;
            }
          }
        } catch (e) {
          console.warn("Course lookup error:", e);
        }
        navigate('/teacher/notifications');
        return;
      } else if (userRole === 'admin' || userRole === 'super_admin') {
        navigate('/admin/users');
        return;
      }
    }

    // 2. Assignment / Submission / Quiz notification
    if (title.includes('assignment') || title.includes('submission') || title.includes('quiz') || msg.includes('quiz')) {
      if (userRole === 'teacher') {
        navigate('/teacher/assignments');
      } else {
        navigate('/student/assignments');
      }
      return;
    }

    // 3. Live class / Calendar notification
    if (title.includes('live') || msg.includes('live class') || msg.includes('rescheduled')) {
      if (userRole === 'teacher') {
        navigate('/teacher/calendar');
      } else {
        navigate('/student/calendar');
      }
      return;
    }

    // Default route
    if (userRole === 'teacher') {
      navigate('/teacher/notifications');
    } else if (userRole === 'student') {
      navigate('/student/notifications');
    } else if (userRole === 'admin') {
      navigate('/admin/notifications');
    }
  };

  return (
    <header className="h-16 border-b border-border/40 bg-background/85 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 pt-[env(safe-area-inset-top,0px)] shadow-2xs">
      {/* Left section: Sidebar trigger & Mobile Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <SidebarTrigger className="touch-press rounded-xl" />
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

      {/* Center Search Bar - Native mobile rounded capsule */}
      <div className="flex-1 max-w-md mx-1 sm:mx-4 min-w-0">
        <button
          type="button"
          onClick={() => setSpotlightOpen(true)}
          className="w-full h-9 px-2.5 sm:px-3 rounded-full border border-border/60 bg-muted/40 text-muted-foreground text-xs flex items-center justify-between hover:bg-muted/70 transition-all touch-press shadow-2xs"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline truncate">Search courses, students, settings...</span>
            <span className="sm:hidden text-xs truncate">Search Orbit...</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] bg-background border px-1.5 py-0.5 rounded">⌘G</span>
        </button>
      </div>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Gamified Aura Points & Credits Navbar Ledger Pill (Students Only) */}
        {userRole === 'student' && (
          <button
            type="button"
            onClick={() => setLedgerSheetOpen(true)}
            className="h-8 sm:h-9 px-2 sm:px-3 rounded-full border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-foreground transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-xs font-mono font-bold shadow-2xs touch-press"
            title="Click to view Gamified Ledger & Credits"
          >
            <span className="text-amber-500 font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30 shrink-0" />
              <span>{auraPoints}</span>
            </span>
            <span className="text-muted-foreground/60 text-[10px]">•</span>
            <span className="text-primary font-bold flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{totalCredits}</span>
            </span>
          </button>
        )}

        {/* Orbit Flux Balance Pill (Click to open Theme Studio) */}
        <button
          type="button"
          onClick={() => setThemeStudioOpen(true)}
          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-foreground transition-all flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs font-mono font-bold shadow-2xs touch-press"
          title="Orbit Flux Theme Currency • Click to open Theme Studio"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
          <span className="text-amber-500 font-bold">{fluxBalance.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">FLUX</span>
        </button>
        {/* Theme Studio Trigger Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setThemeStudioOpen(true)}
          className="relative cursor-pointer hover:bg-accent rounded-full h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-primary transition-colors touch-press"
          title="Orbit Theme Studio & Flux Store (10 Themes)"
        >
          <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-accent rounded-full h-8 w-8 sm:h-9 sm:w-9 touch-press">
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
            <Button variant="ghost" className="relative h-9 w-9 rounded-full touch-press cursor-pointer">
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
            <DropdownMenuItem onClick={() => setThemeStudioOpen(true)} className="cursor-pointer">
              <Palette className="mr-2 h-4 w-4 text-primary" />
              Theme Studio (10 Themes)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />
      <JsonCalendarUpdaterModal />
      <AuraLedgerSheet open={ledgerSheetOpen} onOpenChange={setLedgerSheetOpen} userRole={userRole} />
      <ThemeStudioModal open={themeStudioOpen} onOpenChange={setThemeStudioOpen} userRole={userRole} />
    </header>
  );
}
