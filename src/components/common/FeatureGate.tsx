import React from "react";
import { useCollegeFeatures } from "@/hooks/useCollegeFeatures";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLATFORM_FEATURES } from "@/types/plans";

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ featureId, children, fallback }: FeatureGateProps) {
  const { isFeatureEnabled, loading, collegeName } = useCollegeFeatures();
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

  const featureMeta = PLATFORM_FEATURES.find((f) => f.id === featureId);
  const featureTitle = featureMeta?.name || "Premium Module";
  const featureDesc = featureMeta?.description || "This feature requires an active institutional plan upgrade.";

  return (
    <div className="p-6 max-w-2xl mx-auto my-8">
      <Card className="border-amber-500/30 bg-slate-900/90 text-slate-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <span>{featureTitle}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Plan Upgrade Required
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 max-w-md mx-auto pt-1">
            {featureDesc}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Institutional Plan Restriction</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This module is currently not included in the active subscription plan for{" "}
              <strong className="text-white">{collegeName || "your institution"}</strong>.
              Your institution's administrator can contact the Master Admin to unlock this module.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Go Back
            </Button>
            <Button
              onClick={() => navigate("/student/help-center")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium text-xs shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Request Plan Activation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
