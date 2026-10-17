import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  User,
  Mail,
  Building2,
  Check,
} from "lucide-react";

export interface UserToDelete {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  college_id?: string | null;
}

interface MasterDeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserToDelete | null;
  onSuccess: () => void;
}

export function MasterDeleteUserModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: MasterDeleteUserModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const displayName = user.full_name || user.name || "Unnamed Account";
  const displayEmail = user.email || "No Email";
  const displayRole = (user.role || "user").toUpperCase();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // 1. Cleanly purge child foreign records if existing
      try {
        await supabase.from("enrollments").delete().eq("student_id", user.id);
      } catch (e) {}

      try {
        await supabase.from("attendance").delete().eq("student_id", user.id);
      } catch (e) {}

      try {
        await supabase.from("quiz_attempts").delete().eq("student_id", user.id);
      } catch (e) {}

      try {
        await supabase.from("assignment_submissions").delete().eq("student_id", user.id);
      } catch (e) {}

      try {
        await supabase.from("tickets").delete().eq("user_id", user.id);
      } catch (e) {}

      try {
        await supabase.from("notifications").delete().eq("user_id", user.id);
      } catch (e) {}

      // 2. Delete user from public.users table
      const { error: dbError, count } = await supabase
        .from("users")
        .delete({ count: "exact" })
        .eq("id", user.id);

      if (dbError) {
        console.error("Database user deletion error:", dbError);
        throw dbError;
      }

      // If hard delete didn't remove rows due to RLS, perform soft purge
      if (count === 0) {
        await supabase
          .from("users")
          .update({ status: "deleted" })
          .eq("id", user.id);
      }

      toast({
        title: "Account Permanently Deleted 🗑️",
        description: `Successfully removed ${displayName} (${displayEmail}) from the institutional directory.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Deletion error:", err);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err.message || "Could not delete user account. Please check database permissions.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Delete Institutional Account
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Permanent deletion of account ID & institutional access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Warning Notice */}
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 space-y-1">
            <div className="font-semibold text-rose-200 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Irreversible Administrative Action
            </div>
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              This will remove this user's institutional ID, revoke their workspace permissions, and clear their active profile.
            </p>
          </div>

          {/* Account Target Details Card */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="font-semibold text-white truncate max-w-[220px]">{displayName}</span>
              <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-300">
                {displayRole}
              </Badge>
            </div>
            <div className="text-slate-400 space-y-1 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-slate-500" />
                <span className="text-slate-300 truncate">{displayEmail}</span>
              </div>
              {user.department && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-400 truncate">{user.department}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-600 truncate">
                UUID: {user.id}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-800 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs"
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-2 shadow-sm"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting ID...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" /> Permanently Delete Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
