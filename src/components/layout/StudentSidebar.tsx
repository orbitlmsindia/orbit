import { useNotifications } from "@/contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";
import {
    Home,
    BookOpen,
    Calendar,
    Award,
    Clock,
    Bell,
    Settings,
    HelpCircle,
    LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
import { Button } from "@/components/ui/button";

const studentNavItems = [
    { title: "Dashboard", url: "/student", icon: Home },
    { title: "My Courses", url: "/student/courses", icon: BookOpen },
    { title: "Assignments", url: "/student/assignments", icon: Clock },
    { title: "Grades & Results", url: "/student/grades", icon: Award },
    { title: "Calendar", url: "/student/calendar", icon: Calendar },
    { title: "Notifications", url: "/student/notifications", icon: Bell },
];

const supportItems = [
    { title: "Settings", url: "/student/settings", icon: Settings },
    { title: "Help Center", url: "/student/help-center", icon: HelpCircle },
];




export function StudentSidebar() {
    const { state } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const currentPath = location.pathname;
    const collapsed = state === "collapsed";

    const [user, setUser] = useState({
        name: "Student",
        email: "",
        avatar: "https://github.com/shadcn.png"
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
                name: profile?.full_name || user.user_metadata?.full_name || "Student",
                email: user.email || "",
                avatar: profile?.avatar_url || "https://github.com/shadcn.png"
            });
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    const isActive = (path: string) => {
        if (path === "/student") return currentPath === "/student";
        return currentPath.startsWith(path);
    };

    const NavItem = ({ item }: { item: typeof studentNavItems[0] & { badge?: number } }) => {
        const badgeCount = item.title === "Notifications" ? unreadCount : undefined;

        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                        to={item.url}
                        end={item.url === "/student"}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent group"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1">{item.title}</span>
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
                            <p className="text-xs text-sidebar-foreground/60">Student Portal</p>
                        </div>
                    )}
                </div>
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
                            {studentNavItems.map((item) => (
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
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden">
                        <img src={user.avatar} alt="User" className="h-full w-full object-cover" />
                    </div>
                    {!collapsed && (
                        <div className="text-sm">
                            <p className="font-medium truncate max-w-[150px] text-sidebar-foreground">{user.name}</p>
                            <p className="text-xs text-sidebar-foreground/60">Student</p>
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
