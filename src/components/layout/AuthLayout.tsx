import { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-3xl font-display font-bold text-sidebar-foreground">
              Orbit Launchpad
            </span>
          </div>

          <h1 className="text-4xl font-display font-bold text-sidebar-foreground text-center mb-4">
            Empower Your Learning Journey
          </h1>
          <p className="text-lg text-sidebar-foreground/70 text-center max-w-md">
            Access world-class courses, track your progress, and achieve your educational goals.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-sidebar-primary">500+</p>
              <p className="text-sm text-sidebar-foreground/60">Courses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-sidebar-primary">50K+</p>
              <p className="text-sm text-sidebar-foreground/60">Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-sidebar-primary">98%</p>
              <p className="text-sm text-sidebar-foreground/60">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 bg-background relative overflow-hidden">
        {/* Added background graphics to right side to make the transparency noticeable */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md animate-fade-in bg-card/60 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground">
              Orbit Launchpad
            </span>
          </div>

          {title && (
            <div className="text-center mb-10">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                {title}
              </h2>
              {subtitle && (
                <p className="text-muted-foreground text-sm">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
        {/* Subtle background glow for the curved form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
