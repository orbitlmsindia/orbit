import React from "react";
import { useCollegeFeatures } from "@/hooks/useCollegeFeatures";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ featureId, children, fallback }: FeatureGateProps) {
  const { isFeatureEnabled, loading, collegeName, getFeature } = useCollegeFeatures();
  const navigate = useNavigate();

  if (loading) {
    return <>{children}</>;
  }

  if (isFeatureEnabled(featureId)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureMeta = getFeature(featureId);
  const featureTitle = featureMeta?.name || "Feature Module";
  const featureDesc =
    featureMeta?.description ||
    "This institutional LMS module is currently not included in your institution's subscription plan.";

  const userRole = (sessionStorage.getItem("userRole") || "student").toLowerCase();
  const requestUrl =
    userRole === "admin"
      ? "/admin/billing"
      : userRole === "teacher"
      ? "/teacher/help-center"
      : "/student/help-center";

  return (
    <div className="p-6 max-w-2xl mx-auto my-8">
      <Card className="border-amber-500/30 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <span>{featureTitle}</span>
          </CardTitle>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold mx-auto mt-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Plan Upgrade Required</span>
          </div>
          <CardDescription className="text-slate-400 max-w-md mx-auto pt-3 text-sm">
            {featureDesc}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-300 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Institution Target:</span>
              <strong className="text-white font-medium">{collegeName || "Your Institution"}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Module Status:</span>
              <span className="text-amber-400 font-mono font-medium">Inactive in current tier</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
              This capability can be enabled instantly by the Master SaaS Administrator. You may submit an upgrade inquiry or ask your campus administrator to activate this module.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs h-10 px-4"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go Back
            </Button>
            <Button
              onClick={() => navigate(requestUrl)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium text-xs h-10 px-5 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {userRole === "admin" ? "Manage Subscription Plan" : "Request Feature Activation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Route wrapper component for declarative feature gating
 */
export function GatedFeatureRoute({
  featureId,
  children,
}: {
  featureId: string;
  children: React.ReactNode;
}) {
  return <FeatureGate featureId={featureId}>{children}</FeatureGate>;
}
