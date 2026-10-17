import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemeSelectorGrid } from "./ThemeSelectorGrid";
import { ThemeId } from "@/types/theme";
import { Sparkles, Palette } from "lucide-react";

interface ThemeStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string | null;
}

export function ThemeStudioModal({ open, onOpenChange, userRole }: ThemeStudioModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.25rem)] sm:w-full max-w-4xl max-h-[92vh] overflow-y-auto p-3.5 sm:p-6 rounded-2xl border-border bg-background shadow-2xl overscroll-contain">
        <DialogHeader className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Palette className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              Orbit Theme Studio & Flux Store
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Explore 10 bespoke visual themes. Master Admin and College Admins enjoy unrestricted VIP access, while learners can unlock exclusive aesthetics with ⚡ Orbit Flux.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <ThemeSelectorGrid
            userRole={userRole}
            onThemeEquipped={() => {
              // Leave modal open so user can inspect and try others if desired
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
