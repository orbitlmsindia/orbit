import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Award, Plus, BookOpen, CheckSquare, Square, Loader2, Trash2, ExternalLink } from "lucide-react";

export default function CertificatePrograms() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);

  // Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch teacher courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, credit_points')
        .or(`teacher_id.eq.${user.id}`);

      setTeacherCourses(courses || []);

      // 2. Fetch certificate programs
      const { data: progs, error } = await supabase
        .from('certificate_programs')
        .select(`
          *,
          courses:program_courses(
            id,
            course:courses(id, title, credit_points)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(progs || []);

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Program title is required." });
      return;
    }
    if (selectedCourseIds.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select at least one course for the certificate program." });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate total credits
      const selectedCourses = teacherCourses.filter(c => selectedCourseIds.includes(c.id));
      const totalCredits = selectedCourses.reduce((sum, c) => sum + (c.credit_points || 3), 0);

      // Insert program
      const { data: prog, error: progError } = await supabase
        .from('certificate_programs')
        .insert([{
          teacher_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          total_credits: totalCredits
        }])
        .select('id')
        .single();

      if (progError) throw progError;

      // Insert program courses mapping
      const mapping = selectedCourseIds.map((cid, idx) => ({
        program_id: prog.id,
        course_id: cid,
        order_index: idx
      }));

      const { error: mapError } = await supabase.from('program_courses').insert(mapping);
      if (mapError) throw mapError;

      toast({
        title: "Certificate Program Created! 🎓",
        description: `Successfully created "${title}" with ${totalCredits} Total Credits across ${selectedCourseIds.length} course(s).`
      });

      setTitle("");
      setDescription("");
      setSelectedCourseIds([]);
      setCreateOpen(false);
      fetchData();

    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProgram = async (progId: string) => {
    if (!confirm("Are you sure you want to delete this certificate program?")) return;
    const { error } = await supabase.from('certificate_programs').delete().eq('id', progId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Deleted", description: "Certificate program removed." });
      fetchData();
    }
  };

  const toggleCourseSelection = (cid: string) => {
    if (selectedCourseIds.includes(cid)) {
      setSelectedCourseIds(selectedCourseIds.filter(id => id !== cid));
    } else {
      setSelectedCourseIds([...selectedCourseIds, cid]);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Award className="h-7 w-7 text-primary" /> Certificate Specialization Programs
            </h1>
            <p className="text-muted-foreground mt-1">Combine multiple courses into a multi-credit Certificate Program for your students.</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" /> Create Specialization Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Certificate Specialization Program</DialogTitle>
                <DialogDescription>Select multiple courses to group under a master certificate program with cumulative credits.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label>Program Title</Label>
                  <Input
                    placeholder="e.g., Executive Master Specialization in AI & Software Architecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description & Learning Outcomes</Label>
                  <Textarea
                    placeholder="Describe what students will master by completing this certificate program..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between items-center">
                    <span>Select Included Courses ({selectedCourseIds.length} selected)</span>
                    <span className="text-xs font-mono text-primary font-bold">
                      Total Credits: {teacherCourses.filter(c => selectedCourseIds.includes(c.id)).reduce((acc, curr) => acc + (curr.credit_points || 3), 0)} pts
                    </span>
                  </Label>
                  <div className="max-h-48 overflow-y-auto border rounded-xl p-2 space-y-1 bg-muted/20">
                    {teacherCourses.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">No courses found. Create courses first!</p>
                    ) : (
                      teacherCourses.map((c) => {
                        const isSelected = selectedCourseIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleCourseSelection(c.id)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/40 text-primary font-semibold' : 'bg-background hover:bg-muted'}`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                              <span>{c.title}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {c.credit_points || 3} Credits
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProgram} disabled={isSubmitting} className="gap-2 bg-primary text-primary-foreground font-semibold">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Publish Specialization Program"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Programs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Award className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="font-bold text-lg">No Certificate Programs Created Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Combine your individual courses into multi-credit Specialization Certificate Programs for your students.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create First Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programs.map((p) => (
              <Card key={p.id} className="border hover:border-primary/40 transition-colors shadow-sm overflow-hidden flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] mb-1">
                        🎓 Specialization Certificate
                      </Badge>
                      <CardTitle className="text-xl font-bold">{p.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary shrink-0">
                      {p.total_credits} Total Credits
                    </Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {p.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Included Courses ({p.courses?.length || 0})</p>
                    <div className="space-y-1.5">
                      {p.courses?.map((pc: any, idx: number) => (
                        <div key={pc.id || idx} className="p-2 rounded-lg bg-muted/40 border text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-foreground">{pc.course?.title}</span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">{pc.course?.credit_points || 3} Credits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t">
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs" onClick={() => handleDeleteProgram(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete Program
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
