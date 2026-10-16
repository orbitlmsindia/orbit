import { useState, useEffect, useMemo } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Building2, 
  Users, 
  Download, 
  Search, 
  RefreshCw, 
  Eye, 
  Sparkles, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Award,
  Layers,
  Calendar,
  IndianRupee,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function MasterCourses() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Course Deep Inspection Modal
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchCoursesData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Colleges
      const { data: cols } = await supabase
        .from("colleges")
        .select("id, name, email")
        .order("name", { ascending: true });
      setColleges(cols || []);

      // 2. Fetch Teachers for instructor name lookup
      const { data: teachersData } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("role", ["teacher", "admin"]);
      setTeachers(teachersData || []);

      // 3. Fetch all courses
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          college_id,
          teacher_id,
          price,
          credit_points,
          is_published,
          course_domain,
          course_level,
          course_type,
          duration_hours,
          instructor_name,
          instructor_designation,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(coursesData || []);
    } catch (err: any) {
      console.error("Error loading master courses:", err);
      toast({
        title: "Courses Load Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesData();
  }, []);

  const getCollegeName = (colId: string | null) => {
    if (!colId) return "Orbit Global Platform";
    const match = colleges.find((c) => c.id === colId);
    return match ? match.name : "Partner Institution";
  };

  const getInstructorName = (course: any) => {
    if (course.instructor_name) return course.instructor_name;
    if (course.teacher_id) {
      const match = teachers.find((t) => t.id === course.teacher_id);
      if (match) return match.full_name;
    }
    return "Assigned Faculty";
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // College Filter
      if (selectedCollege !== "all") {
        if (selectedCollege === "global" && c.college_id !== null) return false;
        if (selectedCollege !== "global" && c.college_id !== selectedCollege) return false;
      }

      // Publication Status Filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "published" && !c.is_published) return false;
        if (selectedStatus === "draft" && c.is_published) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (c.title || "").toLowerCase().includes(query);
        const descMatch = (c.description || "").toLowerCase().includes(query);
        const domainMatch = (c.course_domain || "").toLowerCase().includes(query);
        const colMatch = getCollegeName(c.college_id).toLowerCase().includes(query);
        const instMatch = getInstructorName(c).toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !domainMatch && !colMatch && !instMatch) {
          return false;
        }
      }

      return true;
    });
  }, [courses, colleges, teachers, selectedCollege, selectedStatus, searchQuery]);

  // Export Courses List as CSV
  const handleDownloadCSV = () => {
    try {
      const nowStr = new Date().toISOString().split("T")[0];
      const selectedColName = selectedCollege === "all" 
        ? "All_Colleges" 
        : (colleges.find(c => c.id === selectedCollege)?.name || "College").replace(/[^a-zA-Z0-9]/g, "_");

      let csv = `ORBIT LMS - MASTER COURSES & CURRICULUM REGISTRY EXPORT\n`;
      csv += `Export Date,${new Date().toLocaleString('en-IN')}\n`;
      csv += `Institution Filter,${selectedColName}\n`;
      csv += `Total Courses Exported,${filteredCourses.length}\n\n`;

      csv += `Course ID,Curriculum Title,Institution / College Name,Instructor,Domain / Category,Credit Points,Fee (INR),Status,Duration (Hours),Created At\n`;

      filteredCourses.forEach((c) => {
        const id = c.id || "";
        const title = `"${(c.title || "").replace(/"/g, '""')}"`;
        const collegeName = `"${getCollegeName(c.college_id).replace(/"/g, '""')}"`;
        const instructor = `"${getInstructorName(c).replace(/"/g, '""')}"`;
        const domain = `"${(c.course_domain || "General Academic").replace(/"/g, '""')}"`;
        const credits = c.credit_points || 3;
        const price = c.price || 0;
        const status = c.is_published ? "PUBLISHED" : "DRAFT";
        const duration = c.duration_hours || "Self-Paced";
        const createdAt = c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "";

        csv += `${id},${title},${collegeName},${instructor},${domain},${credits},${price},${status},${duration},${createdAt}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orbit_master_courses_${selectedColName}_${nowStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Courses Exported Successfully",
        description: `Saved ${filteredCourses.length} courses to CSV report.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Inspect Course
  const handleOpenCourseDetail = async (course: any) => {
    setSelectedCourse(course);
    setCourseModalOpen(true);
    setLoadingStudents(true);
    try {
      const { data: enrs } = await supabase
        .from("enrollments")
        .select(`
          id,
          status,
          progress,
          enrolled_at,
          user:users!student_id(full_name, email, department)
        `)
        .eq("course_id", course.id);

      setEnrolledStudents(enrs || []);
    } catch (err) {
      console.warn("Could not load enrolled students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const publishedCount = courses.filter((c) => c.is_published).length;
  const draftCount = courses.filter((c) => !c.is_published).length;

  return (
    <MasterLayout
      headerTitle="Global Courses & Curriculums Directory"
      headerDescription="Deep inspection of all educational courses, domain syllabi, credits, and student enrollments created by partner colleges and universities."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCoursesData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Courses
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadCSV}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download Courses ({filteredCourses.length})
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Provisioned Courses</span>
                <BookOpen className="h-4 w-4 text-purple-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-white">{courses.length}</div>
              <p className="text-xs text-slate-400 mt-1">Across all colleges & institutions</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Live Published Curriculums</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-emerald-400">{publishedCount}</div>
              <p className="text-xs text-slate-400 mt-1">Available for student enrollment</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Draft / In-Preparation</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-amber-400">{draftCount}</div>
              <p className="text-xs text-slate-400 mt-1">Pending review or faculty publishing</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search course title, domain, instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              {/* College Filter */}
              <div>
                <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="All Colleges / Institutes" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">All Institutions ({colleges.length})</SelectItem>
                    <SelectItem value="global">Global Platform Courses</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="All Publication Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published ({publishedCount})</SelectItem>
                    <SelectItem value="draft">Drafts ({draftCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-400" />
                Course Curriculums Matrix
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Showing {filteredCourses.length} of {courses.length} total curriculums
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-purple-400" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/80">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300 pl-6">Curriculum Title</TableHead>
                    <TableHead className="text-slate-300">Creator Institution</TableHead>
                    <TableHead className="text-slate-300">Faculty Instructor</TableHead>
                    <TableHead className="text-center text-slate-300">Credits</TableHead>
                    <TableHead className="text-right text-slate-300">Pricing</TableHead>
                    <TableHead className="text-center text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-300 pr-6">Deep Inspection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        <RefreshCw className="h-5 w-5 animate-spin inline mr-2 text-purple-400" />
                        Loading courses directory from database...
                      </TableCell>
                    </TableRow>
                  ) : filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        No courses found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses.map((c) => {
                      const collegeName = getCollegeName(c.college_id);
                      const instructor = getInstructorName(c);

                      return (
                        <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                          {/* Title & Domain */}
                          <TableCell className="pl-6">
                            <div className="font-semibold text-slate-100 hover:text-purple-400 cursor-pointer" onClick={() => handleOpenCourseDetail(c)}>
                              {c.title}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>{c.course_domain || "General Domain"}</span>
                              {c.duration_hours && <span>• {c.duration_hours}h duration</span>}
                            </div>
                          </TableCell>

                          {/* Institution */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {collegeName}
                            </div>
                          </TableCell>

                          {/* Instructor */}
                          <TableCell className="text-xs text-slate-300">
                            {instructor}
                          </TableCell>

                          {/* Credits */}
                          <TableCell className="text-center font-mono text-xs font-semibold text-indigo-400">
                            {c.credit_points || 3} CR
                          </TableCell>

                          {/* Price */}
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                            {c.price ? `₹${c.price.toLocaleString("en-IN")}` : "Free"}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Badge
                              variant={c.is_published ? "default" : "outline"}
                              className={
                                c.is_published
                                  ? "bg-emerald-600 text-white text-[11px]"
                                  : "border-slate-700 text-slate-400 text-[11px]"
                              }
                            >
                              {c.is_published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCourseDetail(c)}
                              className="h-7 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1 px-2.5"
                            >
                              <Eye className="h-3 w-3 text-purple-400" /> Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Deep Inspection Dialog */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
              <BookOpen className="h-5 w-5 text-purple-400" />
              Course Inspection: {selectedCourse?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-4 pt-2">
              {/* Course Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Curriculum Title</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedCourse.title}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Creating Institution</span>
                  <p className="text-slate-200 font-semibold mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {getCollegeName(selectedCourse.college_id)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Designated Instructor</span>
                  <p className="text-slate-200 mt-0.5">{getInstructorName(selectedCourse)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Academic Credit Value</span>
                  <p className="text-indigo-400 font-bold font-mono text-sm mt-0.5">
                    {selectedCourse.credit_points || 3} Credits
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Domain / Category</span>
                  <p className="text-slate-300 font-mono mt-0.5">
                    {selectedCourse.course_domain || "General"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Student Tuition Fee</span>
                  <p className="text-emerald-400 font-mono font-bold mt-0.5">
                    {selectedCourse.price ? `₹${selectedCourse.price.toLocaleString("en-IN")}` : "Free Platform Course"}
                  </p>
                </div>
              </div>

              {/* Course Description */}
              {selectedCourse.description && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Course Description</span>
                  {selectedCourse.description}
                </div>
              )}

              {/* Enrolled Students Matrix */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Enrolled Students ({enrolledStudents.length})
                </h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <Table>
                    <TableHeader className="bg-slate-900/60">
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400 text-xs">Student Name</TableHead>
                        <TableHead className="text-slate-400 text-xs">Email</TableHead>
                        <TableHead className="text-center text-slate-400 text-xs">Progress</TableHead>
                        <TableHead className="text-right text-slate-400 text-xs">Enrollment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingStudents ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                            Loading enrolled student records...
                          </TableCell>
                        </TableRow>
                      ) : enrolledStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                            No students currently enrolled in this curriculum.
                          </TableCell>
                        </TableRow>
                      ) : (
                        enrolledStudents.map((enr, idx) => (
                          <TableRow key={idx} className="border-slate-800 hover:bg-slate-900/40">
                            <TableCell className="text-xs font-semibold text-slate-200">
                              {enr.user?.full_name || "Student"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-300">
                              {enr.user?.email || "N/A"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono text-emerald-400">
                              {enr.progress || 0}%
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                                {(enr.status || "Approved").toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setCourseModalOpen(false)}
                  className="text-slate-400 text-xs h-8"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
