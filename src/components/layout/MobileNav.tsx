import { useLocation, Link } from "react-router-dom";
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  CheckSquare,
  Users,
  Bell,
  BarChart3,
  Building2,
  CreditCard,
  PieChart,
  Trophy,
  ClipboardList,
  Sparkles,
  Layers,
  FileCheck
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

export function MobileNav() {
  const location = useLocation();
  const path = location.pathname;

  let unreadCount = 0;
  try {
    const notifContext = useNotifications();
    unreadCount = notifContext?.unreadCount || 0;
  } catch (_) {}

  // Determine Role and Navigation Items
  let navItems: { title: string; url: string; icon: any; badge?: number }[] = [];

  if (path.startsWith("/admin")) {
    navItems = [
      { title: "Dashboard", url: "/admin", icon: Home },
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Courses", url: "/admin/courses", icon: BookOpen },
      { title: "Alerts", url: "/admin/notifications", icon: Bell, badge: unreadCount },
      { title: "Billing", url: "/admin/billing", icon: CreditCard },
    ];
  } else if (path.startsWith("/teacher")) {
    navItems = [
      { title: "Dashboard", url: "/teacher", icon: Home },
      { title: "Courses", url: "/teacher/courses", icon: BookOpen },
      { title: "Attendance", url: "/teacher/attendance", icon: CheckSquare },
      { title: "Reviews", url: "/teacher/reviews", icon: FileCheck },
      { title: "Calendar", url: "/teacher/calendar", icon: Calendar },
    ];
  } else if (path.startsWith("/master")) {
    navItems = [
      { title: "Dashboard", url: "/master", icon: Home },
      { title: "Colleges", url: "/master/colleges", icon: Building2 },
      { title: "Plans", url: "/master/plans", icon: Layers },
      { title: "Blogs", url: "/master/blogs", icon: ClipboardList },
      { title: "Analytics", url: "/master/analytics", icon: PieChart },
    ];
  } else if (path.startsWith("/finance")) {
    navItems = [
      { title: "Dashboard", url: "/finance", icon: Home },
      { title: "Invoices", url: "/finance/invoices", icon: CreditCard },
      { title: "Ledger", url: "/finance/transactions", icon: BarChart3 },
    ];
  } else {
    // Student navigation (default)
    navItems = [
      { title: "Home", url: "/student", icon: Home },
      { title: "Courses", url: "/student/courses", icon: BookOpen },
      { title: "Attendance", url: "/student/attendance", icon: CheckSquare },
      { title: "Updates", url: "/student/notifications", icon: Bell, badge: unreadCount },
      { title: "Schedule", url: "/student/calendar", icon: Calendar },
    ];
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/85 backdrop-blur-2xl border-t border-border/50 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-all duration-300"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-15 sm:h-16 px-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            path === item.url ||
            (item.url !== "/student" &&
              item.url !== "/admin" &&
              item.url !== "/teacher" &&
              item.url !== "/master" &&
              path.startsWith(item.url));

          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 select-none group touch-press relative ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground/80 hover:text-foreground font-medium"
              }`}
            >
              {/* Icon Container with glowing active pill */}
              <div
                className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary/15 text-primary scale-105 shadow-[0_0_12px_rgba(var(--primary),0.25)]"
                    : "group-hover:bg-muted/40"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? "scale-105 stroke-[2.4px]" : "stroke-[1.8px]"
                  }`}
                />

                {/* Notification Badge */}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs animate-pulse">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Title & Micro Dot */}
              <span
                className={`text-[10px] tracking-tight truncate max-w-[64px] text-center mt-0.5 leading-none transition-colors ${
                  isActive ? "text-primary font-bold scale-100" : "text-muted-foreground"
                }`}
              >
                {item.title}
              </span>

              {/* Active Indicator Micro-Glow Dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-primary mt-1 shadow-[0_0_6px_var(--primary)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
