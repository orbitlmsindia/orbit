import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Fetch user role and college_id
        let role = "";
        let college_id = null;
        let status = "active";

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role, status, college_id")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (userData) {
          role = (userData.role || "").toLowerCase();
          college_id = userData.college_id;
          status = userData.status || "active";
        } else {
          // Fallback to metadata
          role = (
            data.session.user.app_metadata?.user_role ||
            data.session.user.user_metadata?.role ||
            ""
          ).toLowerCase();
          college_id = data.session.user.app_metadata?.college_id || null;
        }

        if (status === 'pending') {
          await supabase.auth.signOut();
          setError("Your account is pending approval. Please contact the administrator.");
          return;
        }

        if (status === 'revoked' || status === 'inactive' || status === 'deactivated') {
          await supabase.auth.signOut();
          setError("This account has been revoked or deactivated. Please contact the administrator.");
          return;
        }

        // Store Role and CollegeID in session storage
        sessionStorage.setItem('userRole', role);
        if (college_id) {
          sessionStorage.setItem('collegeId', college_id);
        }

        // Check if tenant college has been turned OFF by Master Admin
        if (role !== "super_admin" && role !== "master_admin" && college_id) {
          const { data: col } = await supabase
            .from("colleges")
            .select("activation_status")
            .eq("id", college_id)
            .maybeSingle();

          if (col && col.activation_status === false) {
            navigate("/service-maintenance");
            return;
          }
        }

        if (role === "super_admin" || role === "master_admin") {
          navigate("/master");
        } else if (role === "admin") {
          navigate("/admin");
        } else if (role === "teacher") {
          navigate("/teacher");
        } else if (role === "finance") {
          navigate("/finance");
        } else if (role === "student") {
          navigate("/student");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your account"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember me 
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={loading}
          />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
            Remember me for 30 days
          </Label>
        </div>*/}

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Register for The Orbit
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

