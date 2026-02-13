import { Home, Users, BookOpen, BarChart3, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const adminNavItems = [
  { title: "Home", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Courses", url: "/admin/courses", icon: BookOpen },
  { title: "Monitor", url: "/admin/monitoring", icon: BarChart3 },
  { title: "Notify", url: "/admin/notifications", icon: Bell },
];

const studentNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Calendar", url: "/calendar", icon: BarChart3 },
  { title: "Progress", url: "/progress", icon: BarChart3 },
];

export function MobileNav() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/admin" || item.url === "/dashboard"}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
