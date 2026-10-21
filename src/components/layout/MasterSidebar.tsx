import { useState, useEffect } from "react";
import {
    Home,
    Building2,
    Users,
    BookOpen,
    CreditCard,
    BarChart3,
    Activity,
    Layers,
    Newspaper,
    Briefcase,
    ShieldCheck,
    LogOut,
    Sparkles,
    Ticket,
    Castle,
    HardDrive
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformPermission } from "@/types/roles";

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

interface NavItemConfig {
    title: string;
    url: string;
    icon: any;
    permission?: PlatformPermission;
}

const mainNavItems: NavItemConfig[] = [
    { title: "Dashboard", url: "/master", icon: Home },
    { title: "Astravyuh Command", url: "/master/astravyuh", icon: Castle },
    { title: "Colleges", url: "/master/colleges", icon: Building2, permission: "view_colleges" },
    { title: "Plans & Features", url: "/master/plans", icon: Layers, permission: "view_plans" },
    { title: "SEO Blogs", url: "/master/blogs", icon: Newspaper, permission: "view_blogs" },
    { title: "Careers & Hiring", url: "/master/careers", icon: Briefcase, permission: "view_careers" },
    { title: "Accounts & Users", url: "/master/accounts", icon: Users, permission: "view_accounts" },
    { title: "Course Explorer", url: "/master/courses", icon: BookOpen, permission: "view_courses" },
    { title: "Billing & Invoices", url: "/master/billing", icon: CreditCard, permission: "view_billing" },
    { title: "Coupons & Discounts", url: "/master/coupons", icon: Ticket, permission: "view_billing" },
    { title: "Analytics", url: "/master/analytics", icon: BarChart3, permission: "view_analytics" },
    { title: "Monitoring", url: "/master/monitoring", icon: Activity, permission: "system_monitoring" },
    { title: "Data & Backups", url: "/master/monitoring", icon: HardDrive, permission: "system_monitoring" },
    { title: "Staff & Roles", url: "/master/roles", icon: ShieldCheck, permission: "manage_roles" },
];

export function MasterSidebar() {
    const { state, isMobile, setOpenMobile } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const collapsed = state === "collapsed";

    const [user, setUser] = useState({
        name: "Master Admin",
        email: "master@orbitlms.in",
        roleTitle: "Root Master Authority",
        avatar: "https://github.com/shadcn.png",
        isRoot: true,
    });

    const [userPermissions, setUserPermissions] = useState<PlatformPermission[]>([]);

    useEffect(() => {
        // 1. Check if logged in as custom delegated staff member
        const staffJson = sessionStorage.getItem("masterStaffUser");
        const permissionsJson = sessionStorage.getItem("masterPermissions");
        const role = sessionStorage.getItem("userRole") || "super_admin";

        if (staffJson) {
            try {
                const staffMember = JSON.parse(staffJson);
                const perms = permissionsJson ? JSON.parse(permissionsJson) : [];
                setUser({
                    name: staffMember.fullName || "Staff Delegate",
                    email: staffMember.email || "staff@orbitlms.in",
                    roleTitle: staffMember.roleName || "Platform Delegate",
                    avatar: staffMember.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(staffMember.fullName)}`,
                    isRoot: false,
                });
                setUserPermissions(perms);
                return;
            } catch (e) {
                console.warn("Failed to parse staff user metadata:", e);
            }
        }

        // 2. Fallback to Supabase authenticated user
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                const isSuper = role === "super_admin" || role === "master_admin";
                setUser({
                    name: data.user.user_metadata?.full_name || (isSuper ? "Master Admin" : "Platform Delegate"),
                    email: data.user.email || "master@orbitlms.in",
                    roleTitle: isSuper ? "Root Master Authority" : "Master Delegate",
                    avatar: "https://github.com/shadcn.png",
                    isRoot: isSuper,
                });
            }
        });
    }, [location.pathname]);

    const handleLogout = async () => {
        sessionStorage.removeItem("masterStaffUser");
        sessionStorage.removeItem("masterPermissions");
        sessionStorage.removeItem("isMasterStaff");
        sessionStorage.removeItem("userRole");
        await supabase.auth.signOut();
        navigate("/login");
    };

    const isActive = (path: string) => {
        if (path === "/master") return currentPath === "/master";
        return currentPath.startsWith(path);
    };

    // Filter navigation based on user permissions
    const visibleNavItems = mainNavItems.filter((item) => {
        // Master Admin / Super Admin has unrestricted access to everything
        if (user.isRoot) return true;

        // Dashboard is accessible to all signed-in master staff
        if (!item.permission) return true;

        // Otherwise check if specific permission is assigned
        return userPermissions.includes(item.permission);
    });

    const NavItem = ({ item }: { item: NavItemConfig }) => {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                        to={item.url}
                        end={item.url === "/master"}
                        onClick={() => {
                            if (isMobile) setOpenMobile(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent group"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                            <span className="flex-1">{item.title}</span>
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
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shrink-0 overflow-hidden text-primary-foreground font-bold">
                        M
                    </div>
                    {!collapsed && (
                        <div>
                            <span className="text-lg font-display font-bold text-sidebar-foreground">
                                Orbit SaaS
                            </span>
                            <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                                Master Command
                                {user.isRoot && (
                                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    {!collapsed && (
                        <div className="flex items-center justify-between px-3 mb-2">
                            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] font-semibold tracking-wider p-0">
                                Ecosystem Modules
                            </SidebarGroupLabel>
                            {!user.isRoot && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                    Delegated
                                </Badge>
                            )}
                        </div>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {visibleNavItems.map((item) => (
                                <NavItem key={item.title} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden shrink-0">
                        <img src={user.avatar} alt="User" className="h-full w-full object-cover" />
                    </div>
                    {!collapsed && (
                        <div className="text-sm min-w-0 flex-1">
                            <p className="font-medium truncate text-sidebar-foreground">{user.name}</p>
                            <p className="text-[11px] text-sidebar-foreground/60 truncate">{user.roleTitle}</p>
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
