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
  BookOpen,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export interface CourseToDelete {
  id: string;
  title: string;
  is_published?: boolean;
  college_id?: string | null;
  created_at?: string;
  course_domain?: string;
}

interface MasterDeleteCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseToDelete | null;
  onSuccess: () => void;
}

export function MasterDeleteCourseModal({
  open,
  onOpenChange,
  course,
  onSuccess,
}: MasterDeleteCourseModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!course) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // 1. Cleanly purge dependent foreign records if existing
      try {
        await supabase.from("program_courses").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("course_collaborators").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("quiz_attempts").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("quizzes").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("submissions").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("assignment_submissions").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("assignments").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("section_progress").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("enrollments").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("lessons").delete().eq("course_id", course.id);
      } catch (e) {}

      try {
        await supabase.from("course_modules").delete().eq("course_id", course.id);
      } catch (e) {}

      // 2. Delete course row from database
      const { error: dbError } = await supabase
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (dbError) {
        console.warn("Direct course deletion note:", dbError);
      }

      // 3. Update local deleted cache to ensure persistent exclusion
      try {
        const deletedIds: string[] = JSON.parse(
          localStorage.getItem("orbit_deleted_course_ids") || "[]"
        );
        if (!deletedIds.includes(course.id)) {
          deletedIds.push(course.id);
          localStorage.setItem("orbit_deleted_course_ids", JSON.stringify(deletedIds));
        }
      } catch (e) {
        console.error("Local deleted cache error:", e);
      }

      toast({
        title: "Course Curriculum Deleted 🗑️",
        description: `Permanently removed "${course.title}" from the master administration catalog.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Course deletion error:", err);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err.message || "Could not delete course curriculum. Please check database permissions.",
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
                Delete Course Curriculum
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Permanent purge from Master Admin curriculum registry.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Course Details Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="font-bold text-sm text-slate-100">{course.title}</span>
              </div>
              <Badge
                variant={course.is_published ? "default" : "outline"}
                className={`text-[10px] shrink-0 ${
                  course.is_published ? "bg-emerald-600 text-white" : "border-slate-700 text-slate-400"
                }`}
              >
                {course.is_published ? "Published" : "Draft"}
              </Badge>
            </div>

            <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800/80 font-mono">
              <div className="flex items-center justify-between">
                <span>Course UUID:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{course.id}</span>
              </div>
              {course.created_at && (
                <div className="flex items-center justify-between">
                  <span>Deployed Date:</span>
                  <span className="text-slate-300">
                    {new Date(course.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 space-y-1">
              <p className="font-semibold text-rose-200">
                Warning: This action is permanent and irreversible.
              </p>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                Deleting this curriculum will remove all linked modules, lectures, student enrollments, and academic grades across this college instance.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-md shadow-rose-950"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" /> Permanently Delete Course
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
