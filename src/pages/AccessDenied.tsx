import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LogOut, Home, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface AccessDeniedProps {
  requiredRole?: string;
  currentRole?: string;
  userEmail?: string;
}

export default function AccessDenied({
  requiredRole = "Authorized Role",
  currentRole = "unassigned",
  userEmail = "",
}: AccessDeniedProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const roleNameMap: Record<string, { title: string; color: string; homeUrl: string }> = {
    super_admin: { title: "Master SaaS Administrator", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", homeUrl: "/master" },
    master_admin: { title: "Master SaaS Administrator", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", homeUrl: "/master" },
    master_staff: { title: "Master Technical Staff", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", homeUrl: "/master" },
    admin: { title: "Institutional Administrator", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", homeUrl: "/admin" },
    finance: { title: "Finance Officer", color: "text-teal-400 bg-teal-500/10 border-teal-500/30", homeUrl: "/finance" },
    teacher: { title: "Teacher / Faculty", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", homeUrl: "/teacher" },
    student: { title: "Student / Learner", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", homeUrl: "/student" },
  };

  const currentInfo = roleNameMap[currentRole.toLowerCase()] || {
    title: currentRole || "Standard User",
    color: "text-slate-300 bg-slate-800 border-slate-700",
    homeUrl: "/dashboard",
  };

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Signout warning:", e);
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-xl border-rose-500/30 bg-slate-900/90 backdrop-blur-2xl text-slate-100 shadow-2xl shadow-rose-950/40 relative z-10 overflow-hidden">
        {/* Top Gradient Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-red-600" />

        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <Badge className="mx-auto text-[11px] font-mono tracking-wider uppercase bg-rose-500/15 text-rose-300 border-rose-500/30 mb-2">
            Restricted Role Boundary
          </Badge>

          <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Role Permission Required
          </CardTitle>

          <CardDescription className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto pt-1 leading-relaxed">
            Orbit LMS enforces strict multi-tenant role segregation. You cannot trespass into a portal not authorized for your role.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-5 sm:px-8 pb-8">
          {/* Role Comparison Matrix Card */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Page Requested:</span>
              <code className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                {location.pathname}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">This Page Is For:</span>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs font-semibold">
                <Lock className="w-3 h-3 mr-1" /> {requiredRole}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Your Current Account Role:</span>
              <Badge className={`border text-xs font-semibold ${currentInfo.color}`}>
                {currentInfo.title}
              </Badge>
            </div>

            {userEmail && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span>Authenticated Email:</span>
                <span className="font-mono text-slate-300">{userEmail}</span>
              </div>
            )}
          </div>

          {/* Explanation note */}
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            To view this page, you must authenticate with credentials possessing <strong className="text-white">{requiredRole}</strong> access.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              onClick={() => navigate(currentInfo.homeUrl)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs h-11 rounded-xl shadow-lg shadow-blue-500/20"
            >
              <Home className="w-4 h-4 mr-1.5" />
              Go to My {currentInfo.title.split(" ")[0]} Portal
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs h-11 rounded-xl gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign In with Other Role
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
