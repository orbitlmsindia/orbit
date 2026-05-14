import { useState, useEffect } from "react";
import {
    Home,
    Building2,
    CreditCard,
    BarChart3,
    Activity,
    LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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

const mainNavItems = [
    { title: "Dashboard", url: "/master", icon: Home },
    { title: "Colleges", url: "/master/colleges", icon: Building2 },
    { title: "Billing", url: "/master/billing", icon: CreditCard },
    { title: "Analytics", url: "/master/analytics", icon: BarChart3 },
    { title: "Monitoring", url: "/master/monitoring", icon: Activity },
];

export function MasterSidebar() {
    const { state } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const collapsed = state === "collapsed";

    const [user, setUser] = useState({
        name: "Master Admin",
        email: "orbitadmin@orbit.com",
        avatar: "https://github.com/shadcn.png"
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    const isActive = (path: string) => {
        if (path === "/master") return currentPath === "/master";
        return currentPath.startsWith(path);
    };

    const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                        to={item.url}
                        end={item.url === "/master"}
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
                            <p className="text-xs text-sidebar-foreground/60">Master Panel</p>
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
                            {mainNavItems.map((item) => (
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
                            <p className="text-xs text-sidebar-foreground/60">Owner</p>
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
