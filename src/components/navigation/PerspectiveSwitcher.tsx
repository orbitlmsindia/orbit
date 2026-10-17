import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Compass,
  GraduationCap,
  Users,
  ShieldCheck,
  Crown,
  IndianRupee,
  MonitorPlay,
  Palette,
  X,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";

export function PerspectiveSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(() => {
    return localStorage.getItem("orbit_perspective_hidden") === "true";
  });
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);

  // Close popup on route change
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  if (hidden) return null;

  const currentPath = location.pathname;

  const perspectives = [
    {
      id: "student",
      title: "Student Campus",
      subtitle: "Learning, Aura XP, Streaks & Ledgers",
      path: "/student",
      icon: GraduationCap,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    },
    {
      id: "teacher",
      title: "Teacher Studio",
      subtitle: "Courses, AI Builder & Attendance",
      path: "/teacher",
      icon: Users,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      id: "admin",
      title: "College Admin",
      subtitle: "Branding, Letterhead & Backup",
      path: "/admin",
      icon: ShieldCheck,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    },
    {
      id: "master",
      title: "Master Admin Console",
      subtitle: "Colleges, Feature Gates & Plans",
      path: "/master",
      icon: Crown,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    },
    {
      id: "finance",
      title: "Finance & Invoicing",
      subtitle: "Fee Transactions & Billing",
      path: "/finance",
      icon: IndianRupee,
      color: "text-teal-500 bg-teal-500/10 border-teal-500/30",
    },
    {
      id: "presentation",
      title: "Public Presentation Deck",
      subtitle: "Interactive Tour & Pitch Slides",
      path: "/presentation",
      icon: MonitorPlay,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    },
  ];

  return (
    <>
      <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-[60] flex flex-col items-end select-none print:hidden">
        {/* Expanded Navigation Drawer / Popover */}
        {expanded && (
          <div className="mb-3 w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border-2 border-primary/30 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-primary/15 via-card to-accent/10 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">Orbit Role Navigator</h4>
                  <p className="text-[10px] text-muted-foreground">Judge & explore all platform perspectives</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpanded(false)}
                  className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Perspectives List */}
            <div className="p-2 space-y-1 max-h-72 overflow-y-auto divide-y divide-border/40 scrollbar-none">
              {perspectives.map((p) => {
                const Icon = p.icon;
                const isActive = currentPath.startsWith(p.path);

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setExpanded(false);
                      navigate(p.path);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer touch-press ${
                      isActive
                        ? "bg-primary/10 border border-primary/30 font-bold"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${p.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{p.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Theme Studio & Dismiss */}
            <div className="p-2.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpanded(false);
                  setThemeStudioOpen(true);
                }}
                className="h-7 text-[11px] font-bold text-primary border-primary/30 hover:bg-primary/10 rounded-lg gap-1.5 flex-1 touch-press"
              >
                <Palette className="h-3.5 w-3.5" /> 10 Themes Studio
              </Button>

              <button
                type="button"
                onClick={() => {
                  setHidden(true);
                  localStorage.setItem("orbit_perspective_hidden", "true");
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1"
                title="Hide perspective switcher"
              >
                Hide
              </button>
            </div>
          </div>
        )}

        {/* Floating Trigger Pill */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`h-9 px-3 rounded-full border shadow-xl flex items-center gap-2 transition-all cursor-pointer touch-press ${
            expanded
              ? "bg-primary text-primary-foreground border-primary shadow-primary/30 scale-105"
              : "bg-card/90 hover:bg-card text-foreground border-primary/40 hover:border-primary shadow-black/20 backdrop-blur-xl"
          }`}
          title="Toggle Role Navigator"
        >
          <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 animate-spin-slow" />
          </div>
          <span className="text-xs font-bold font-mono tracking-tight">Role Tour</span>
          <ChevronUp className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <ThemeStudioModal
        open={themeStudioOpen}
        onOpenChange={setThemeStudioOpen}
        userRole="admin"
      />
    </>
  );
}
