import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function TeacherCalendar() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Courses taught by teacher
                const { data: courses } = await supabase
                    .from('courses')
                    .select('id, title')
                    .eq('teacher_id', user.id);

                const courseIds = courses?.map(c => c.id) || [];
                const courseMap = new Map(courses?.map(c => [c.id, c.title]));

                let assignmentEvents: any[] = [];
                if (courseIds.length > 0) {
                    const { data: assigns } = await supabase
                        .from('assignments')
                        .select('id, title, due_date, type, course_id')
                        .in('course_id', courseIds)
                        .not('due_date', 'is', null);

                    assignmentEvents = (assigns || []).map(a => ({
                        id: a.id,
                        title: a.title,
                        date: new Date(a.due_date),
                        type: a.type === 'quiz' ? 'quiz' : 'assignment',
                        courseName: courseMap.get(a.course_id),
                        isMyCourse: true
                    }));
                }

                // 2. Fetch General Calendar Events
                const { data: calEvents } = await supabase
                    .from('calendar_events')
                    .select('*')
                    .or(`visibility.eq.all,visibility.eq.teachers`);

                const generalEvents = (calEvents || []).map(e => ({
                    id: e.id,
                    title: e.title,
                    date: new Date(e.event_date),
                    type: 'event',
                    isGeneral: true
                }));

                // Merge and sort
                const allEvents = [...assignmentEvents, ...generalEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
                setEvents(allEvents);

            } catch (error) {
                console.error("Error fetching calendar events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Filter events for selected date
    const selectedDateEvents = date
        ? events.filter(e =>
            e.date.getDate() === date.getDate() &&
            e.date.getMonth() === date.getMonth() &&
            e.date.getFullYear() === date.getFullYear()
        )
        : [];

    return (
        <TeacherLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-display font-bold">Calendar</h1>
                    {/* Future: Add 'Create Event' button for teachers */}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border"
                                modifiers={{
                                    hasEvent: (date) => events.some(e =>
                                        e.date.getDate() === date.getDate() &&
                                        e.date.getMonth() === date.getMonth() &&
                                        e.date.getFullYear() === date.getFullYear()
                                    )
                                }}
                                modifiersStyles={{
                                    hasEvent: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {date ? `Events for ${format(date, 'MMMM d, yyyy')}` : "Upcoming Events"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {(date ? selectedDateEvents : events).length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">No events found.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {(date ? selectedDateEvents : events).map((event, index) => (
                                                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="text-center min-w-[3rem]">
                                                        <span className="block text-xl font-bold font-display text-primary">
                                                            {event.date.getDate()}
                                                        </span>
                                                        <span className="text-xs uppercase text-muted-foreground font-semibold">
                                                            {format(event.date, 'MMM')}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{event.title}</h4>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            <Badge variant="outline" className={
                                                                event.type === 'quiz' ? 'bg-red-50 text-red-600 border-red-200' :
                                                                    event.type === 'assignment' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                                        'bg-green-50 text-green-600 border-green-200'
                                                            }>
                                                                {event.type}
                                                            </Badge>
                                                            {event.courseName && (
                                                                <span className="text-xs text-muted-foreground self-center flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                                                                    {event.courseName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TeacherLayout>
    );
}
