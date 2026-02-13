import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Send, BookOpen, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function TeacherNotifications() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [notificationType, setNotificationType] = useState("course");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sentNotifications, setSentNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch teacher's courses
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, title')
                .eq('teacher_id', user.id);

            setCourses(coursesData || []);

            // Fetch sent notifications (optional - for history)
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('sender_role', 'teacher')
                .order('created_at', { ascending: false })
                .limit(50);

            setSentNotifications(notifs || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if (!title || !message) {
            toast({ variant: "destructive", title: "Missing fields", description: "Please enter title and message." });
            return;
        }

        if (!selectedCourse) {
            toast({ variant: "destructive", title: "No course selected", description: "Please select a course." });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Use RPC function to notify all students in the course
            const { data: count, error } = await supabase.rpc('notify_course_students', {
                p_course_id: selectedCourse,
                p_title: title,
                p_message: message,
                p_notification_type: notificationType,
                p_sender_id: user.id,
                p_sender_role: 'teacher',
                p_priority: 1
            });

            if (error) throw error;

            toast({
                title: "Notification Sent",
                description: `Successfully sent notification to ${count || 0} students.`
            });

            setCreateModalOpen(false);
            setTitle("");
            setMessage("");
            setSelectedCourse("");
            fetchData();

        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    if (loading) {
        return (
            <TeacherLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Course Notifications</h1>
                        <p className="text-muted-foreground mt-1">
                            Send updates and announcements to your students
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
                                <DialogTitle>Send Course Notification</DialogTitle>
                                <DialogDescription>
                                    Notify all enrolled students in a specific course
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {/* Course Selection */}
                                <div className="space-y-2">
                                    <Label>Select Course</Label>
                                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses.map((course) => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    {course.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Notification Type */}
                                <div className="space-y-2">
                                    <Label>Notification Type</Label>
                                    <Select value={notificationType} onValueChange={setNotificationType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="course">Course Update</SelectItem>
                                            <SelectItem value="module">Module Update</SelectItem>
                                            <SelectItem value="assignment">Assignment Update</SelectItem>
                                            <SelectItem value="quiz">Quiz Update</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

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
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{courses.length}</p>
                                <p className="text-sm text-muted-foreground">Your Courses</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-500/10">
                                <Bell className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{sentNotifications.length}</p>
                                <p className="text-sm text-muted-foreground">Sent Notifications</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Notifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sentNotifications.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No notifications sent yet</p>
                                <p className="text-sm mt-1">Send your first course notification to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sentNotifications.slice(0, 10).map((notif) => (
                                    <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{notif.title}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{notif.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TeacherLayout>
    );
}
