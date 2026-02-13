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
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground">
              Orbit Launchpad
            </span>
          </div>

          {title && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {title}
              </h2>
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
