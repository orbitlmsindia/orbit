import { Home, Users, BookOpen, BarChart3, Bell, Calendar, CheckSquare, Building2, CreditCard, PieChart, Award } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const adminNavItems = [
  { title: "Home", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Courses", url: "/admin/courses", icon: BookOpen },
  { title: "Monitor", url: "/admin/monitoring", icon: BarChart3 },
  { title: "Notify", url: "/admin/notifications", icon: Bell },
];

const teacherNavItems = [
  { title: "Home", url: "/teacher", icon: Home },
  { title: "Courses", url: "/teacher/courses", icon: BookOpen },
  { title: "Attendance", url: "/teacher/attendance", icon: CheckSquare },
  { title: "Grades", url: "/teacher/grades", icon: Award },
  { title: "Calendar", url: "/teacher/calendar", icon: Calendar },
];

const masterNavItems = [
  { title: "Home", url: "/master", icon: Home },
  { title: "Colleges", url: "/master/colleges", icon: Building2 },
  { title: "Billing", url: "/master/billing", icon: CreditCard },
  { title: "Analytics", url: "/master/analytics", icon: PieChart },
  { title: "Monitor", url: "/master/monitoring", icon: BarChart3 },
];

const studentNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Grades", url: "/grades", icon: Award },
];

export function MobileNav() {
  const location = useLocation();
  const path = location.pathname;

  let navItems = studentNavItems;
  if (path.startsWith("/admin")) {
    navItems = adminNavItems;
  } else if (path.startsWith("/teacher")) {
    navItems = teacherNavItems;
  } else if (path.startsWith("/master")) {
    navItems = masterNavItems;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border lg:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/admin" || item.url === "/dashboard" || item.url === "/teacher" || item.url === "/master"}
            className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 min-w-[60px] text-muted-foreground transition-colors hover:text-foreground rounded-lg"
            activeClassName="text-primary font-semibold"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium truncate max-w-[68px] text-center leading-tight">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

