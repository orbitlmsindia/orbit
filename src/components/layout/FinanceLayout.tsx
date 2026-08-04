import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  IndianRupee, 
  CreditCard, 
  Receipt, 
  Tag, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  Building2,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface FinanceLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  action?: ReactNode;
}

export function FinanceLayout({ children, headerTitle, headerDescription, action }: FinanceLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Finance Dashboard", path: "/finance", icon: TrendingUp },
    { label: "Fee Transactions", path: "/finance/transactions", icon: CreditCard },
    { label: "Invoices & Billing", path: "/finance/invoices", icon: Receipt },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed Out", description: "Logged out from Finance Portal." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-800 bg-slate-900/90 p-4 sticky top-0 h-screen justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950">
              <IndianRupee className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none tracking-wide text-white">Orbit LMS</h2>
              <p className="text-xs text-emerald-400 font-medium">Finance Department Desk</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="px-3 py-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Role: Finance Officer</span>
            </div>
            <span className="text-[10px] text-emerald-500 bg-emerald-950 px-1.5 py-0.5 rounded font-mono">₹ INR</span>
          </div>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white">Finance Portal</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Button variant="destructive" onClick={handleSignOut} className="w-full mt-4 justify-start">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {(headerTitle || action) && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              {headerTitle && <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{headerTitle}</h1>}
              {headerDescription && <p className="text-sm text-slate-400 mt-1">{headerDescription}</p>}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
