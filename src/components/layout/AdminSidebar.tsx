import { useState } from "react";
import {
  Home,
  Users,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  GraduationCap,
  Building2,
  ChevronDown,
  LogOut,
  Calendar,
  Trophy,
  Mail,
  Receipt
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCollegeFeatures } from "@/hooks/useCollegeFeatures";
import { Lock } from "lucide-react";

interface AdminNavItem {
  title: string;
  url: string;
  icon: any;
  featureId?: string;
}

const mainNavItems: AdminNavItem[] = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Subscriptions & Invoices", url: "/admin/billing", icon: Receipt, featureId: "coupon_engine" },
  { title: "Get In Touch", url: "/admin/inquiries", icon: Mail, featureId: "inquiries" },
  { title: "User Management", url: "/admin/users", icon: Users, featureId: "user_management" },
  { title: "Course Management", url: "/admin/courses", icon: BookOpen, featureId: "course_management" },
  { title: "Calendar", url: "/admin/calendar", icon: Calendar, featureId: "calendar" },
  { title: "Leaderboard", url: "/admin/leaderboard", icon: Trophy, featureId: "leaderboard" },
  { title: "Monitoring", url: "/admin/monitoring", icon: BarChart3, featureId: "advanced_analytics" },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
];

const supportItems: AdminNavItem[] = [
  { title: "Settings", url: "/admin/settings", icon: Settings, featureId: "custom_branding" },
  { title: "Help Center", url: "/admin/help-center", icon: HelpCircle, featureId: "ticket_raising" },
];

export function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { isFeatureEnabled } = useCollegeFeatures();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const [user, setUser] = useState({
    name: "Admin",
    email: "",
    avatar: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      setUser({
        name: profile?.full_name || user.user_metadata?.full_name || "Admin",
        email: user.email || "",
        avatar: profile?.avatar_url || ""
      });
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return currentPath === "/admin";
    return currentPath.startsWith(path);
  };

  const NavItem = ({ item }: { item: AdminNavItem & { badge?: number } }) => {
    // Inject badge if it's the notification item
    const badgeCount = item.title === "Notifications" ? unreadCount : undefined;
    const isLocked = item.featureId ? !isFeatureEnabled(item.featureId) : false;

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink
            to={item.url}
            end={item.url === "/admin"}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent group ${
              isLocked ? "opacity-75" : ""
            }`}
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {isLocked && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                    <Lock className="h-2.5 w-2.5" /> Plan
                  </span>
                )}
                {badgeCount !== undefined && badgeCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 text-[10px]">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-display font-bold text-sidebar-foreground">
                Orbit Launchpad
              </span>
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Institute Selector removed */}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold tracking-wider px-3 mb-2">
              Main Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-semibold tracking-wider px-3 mb-2">
              Support
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {supportItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user.name ? user.name.split(" ").map(n => n[0]).join("") : "A"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="text-sm">
              <p className="font-medium truncate max-w-[150px] text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrator</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
