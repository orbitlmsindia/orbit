import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Plus,
  Send,
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Templates can remain static or be moved to DB later
const templates = [
  { id: 1, name: "Assignment Reminder", content: "This is a reminder that [ASSIGNMENT] is due on [DATE]. Please ensure your submission is complete." },
  { id: 2, name: "Course Update", content: "We have updated the course materials for [COURSE]. Please review the new content." },
  { id: 3, name: "Maintenance Notice", content: "The platform will undergo maintenance on [DATE] from [TIME] to [TIME]. Please save your work." },
  { id: 4, name: "Welcome Message", content: "Welcome to [COURSE]! We're excited to have you. Get started by reviewing the course outline." },
];

export default function Notifications() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("history");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [notificationType, setNotificationType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [notificationsHistory, setNotificationsHistory] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Notifications
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (notifs) {
      setNotificationsHistory(notifs.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        audience: n.visibility || "all",
        type: n.notification_type || "announcement",
        status: "sent",
        sentAt: new Date(n.created_at).toLocaleString(),
        readRate: 0 // Requires tracking
      })));
    }

    // Fetch Courses for selection
    const { data: courses } = await supabase.from('courses').select('id, title'); // title instead of name
    if (courses) {
      setCoursesList(courses);
    }
    setLoading(false);
  };

  const handleSendNotification = async () => {
    if (!title || !message) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter title and message." });
      return;
    }

    if (selectedAudience === "courses" && selectedCourses.length === 0) {
      toast({ variant: "destructive", title: "No courses selected", description: "Please select at least one course." });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = userData?.role || 'admin';
      const priority = userRole === 'admin' ? 2 : 1;

      if (selectedAudience === "courses") {
        // Send to specific courses using RPC function
        let totalSent = 0;
        for (const courseId of selectedCourses) {
          const { data: count, error } = await supabase.rpc('notify_course_students', {
            p_course_id: courseId,
            p_title: title,
            p_message: message,
            p_notification_type: notificationType,
            p_sender_id: user.id,
            p_sender_role: userRole,
            p_priority: priority
          });

          if (error) throw error;
          totalSent += (count || 0);
        }

        toast({
          title: "Notifications Sent",
          description: `Successfully sent ${totalSent} notifications to ${selectedCourses.length} course(s).`
        });
      } else {
        // Send to all users of a specific role
        let targetUsers: any[] = [];

        if (selectedAudience === "all") {
          const { data } = await supabase.from('users').select('id');
          targetUsers = data || [];
        } else if (selectedAudience === "students") {
          const { data } = await supabase.from('users').select('id').eq('role', 'student');
          targetUsers = data || [];
        } else if (selectedAudience === "teachers") {
          const { data } = await supabase.from('users').select('id').eq('role', 'teacher');
          targetUsers = data || [];
        }

        // Insert notifications for each user
        const notifications = targetUsers.map(u => ({
          user_id: u.id,
          title,
          message,
          notification_type: notificationType,
          priority,
          sender_role: userRole,
          visibility: selectedAudience,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;

        toast({
          title: "Notifications Sent",
          description: `Successfully sent ${targetUsers.length} notifications.`
        });
      }

      setCreateModalOpen(false);
      setTitle("");
      setMessage("");
      setSelectedCourses([]);
      setSelectedAudience("all");
      fetchData(); // Refresh list

    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      setCreateModalOpen(true);
    }
  };

  const handleCourseToggle = (courseId: number) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const getAudienceDisplay = (audience: string) => {
    if (audience === "all") return { label: "All Users", icon: Users };
    if (audience === "students") return { label: "All Students", icon: Users };
    if (audience === "teachers") return { label: "All Teachers", icon: GraduationCap };
    if (audience.startsWith("course:")) return { label: audience.replace("course:", ""), icon: BookOpen };
    return { label: audience, icon: Users };
  };

  const getTypeConfig = (type: string) => {
    const configs = {
      announcement: { label: "Announcement", variant: "default" as const, icon: Megaphone },
      reminder: { label: "Reminder", variant: "warning" as const, icon: Clock },
      alert: { label: "Alert", variant: "destructive" as const, icon: AlertCircle },
      system: { label: "System", variant: "secondary" as const, icon: Info },
      event: { label: "Event", variant: "accent" as const, icon: Bell },
    };
    return configs[type as keyof typeof configs] || configs.announcement;
  };

  const historyColumns = [
    {
      key: "title",
      header: "Notification",
      cell: (row: any) => {
        const typeConfig = getTypeConfig(row.type);
        return (
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted`}>
              <typeConfig.icon className={`h-4 w-4 text-muted-foreground`} />
            </div>
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{row.message}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      cell: (row: any) => {
        const config = getTypeConfig(row.type);
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "audience",
      header: "Audience",
      cell: (row: any) => {
        const display = getAudienceDisplay(row.audience);
        return (
          <div className="flex items-center gap-2">
            <display.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{display.label}</span>
          </div>
        );
      },
    },
    {
      key: "sentAt",
      header: "Sent",
      cell: (row: any) => (
        <span className="text-muted-foreground text-sm">{row.sentAt}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.status === "sent" ? "success" : "secondary"}>
          {row.status === "sent" ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Sent</>
          ) : (
            <><Clock className="h-3 w-3 mr-1" /> Scheduled</>
          )}
        </Badge>
      ),
    },
    {
      key: "readRate",
      header: "Read Rate",
      cell: (row: any) => (
        <span className="text-muted-foreground">-</span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Send announcements and manage notification history
            </p>
          </div>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to students, teachers, or specific courses
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                {/* Notification Type */}
                <div className="space-y-2">
                  <Label>Notification Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["announcement", "reminder", "alert", "event"].map((type) => {
                      const config = getTypeConfig(type);
                      return (
                        <button
                          key={type}
                          onClick={() => setNotificationType(type)}
                          className={`p-3 rounded-lg border-2 transition-all text-center ${notificationType === type
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                            }`}
                        >
                          <config.icon className={`h-5 w-5 mx-auto mb-1 ${notificationType === type ? "text-primary" : "text-muted-foreground"
                            }`} />
                          <span className="text-xs font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audience Selection */}
                <div className="space-y-2">
                  <Label>Select Audience</Label>
                  <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="students">All Students</SelectItem>
                      <SelectItem value="teachers">All Teachers</SelectItem>
                      <SelectItem value="courses">Specific Courses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Course Selection (if courses selected) */}
                {selectedAudience === "courses" && (
                  <div className="space-y-2">
                    <Label>Select Courses</Label>
                    <div className="border border-border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {coursesList.map((course: any) => (
                        <div key={course.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={() => handleCourseToggle(course.id)}
                          />
                          <Label htmlFor={`course-${course.id}`} className="font-normal flex-1 cursor-pointer">
                            {course.title}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter notification title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your notification message..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="gap-2" onClick={handleSendNotification}>
                  <Send className="h-4 w-4" />
                  Send Notification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notificationsHistory.length}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
            <DataTable
              data={notificationsHistory}
              columns={historyColumns}
              searchPlaceholder="Search notifications..."
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{template.content}</p>
                    <Button variant="outline" size="sm" onClick={() => handleTemplateSelect(template.id)}>
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
