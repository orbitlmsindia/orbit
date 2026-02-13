import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminCalendar() {
    const { toast } = useToast();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("event");
    const [visibility, setVisibility] = useState("all");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('calendar_events')
                .select('id, title, description, event_date, type, visibility') // explicitly select to avoid unintended joins
                .order('event_date', { ascending: true });

            if (error) {
                // Check for 403 explicitly
                if (error.code === '42501' || error.message.includes('permission denied')) {
                    console.warn("Calendar access denied by RLS");
                    setEvents([]); // Show empty calendar instead of crash
                    // Optional: toast warning once
                    return;
                }
                throw error;
            }

            // Parse dates
            const parsedEvents = (data || []).map(e => ({
                ...e,
                date: new Date(e.event_date)
            }));

            setEvents(parsedEvents);
        } catch (error: any) {
            console.error("Error fetching events:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load events." });
        } finally {
            setLoading(false);
        }
    };

    const handleAddEvent = async () => {
        if (!title || !date) {
            toast({ variant: "destructive", title: "Error", description: "Title and Date are required." });
            return;
        }

        try {
            setIsSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                title,
                description,
                event_date: date.toISOString(),
                type,
                visibility,
                // created_by removed to avoid RLS strict checks on users table for now
            };

            const { error } = await supabase
                .from('calendar_events')
                .insert([payload]);

            if (error) throw error;

            toast({ title: "Event Added", description: "The event has been added to the calendar." });
            setOpen(false);

            // Reset form
            setTitle("");
            setDescription("");
            setType("event");
            setVisibility("all");

            fetchEvents();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: "Deleted", description: "Event removed." });
            fetchEvents();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    // Filter events for selected date
    const selectedDateEvents = date
        ? events.filter(e =>
            e.date.getDate() === date.getDate() &&
            e.date.getMonth() === date.getMonth() &&
            e.date.getFullYear() === date.getFullYear()
        )
        : [];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Calendar Management</h1>
                        <p className="text-muted-foreground mt-1">Manage events, holidays, and announcements.</p>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Add Event
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Event</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Event Title</Label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Annual Sports Day" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <div className="p-2 border rounded-md bg-muted/20 text-sm">
                                        {date ? format(date, 'PPP') : "Select a date on the calendar first"}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select a date on the main calendar to change this.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="event">General Event</SelectItem>
                                                <SelectItem value="holiday">Holiday</SelectItem>
                                                <SelectItem value="deadline">Deadline</SelectItem>
                                                <SelectItem value="announcement">Announcement</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Visibility</Label>
                                        <Select value={visibility} onValueChange={setVisibility}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Everyone</SelectItem>
                                                <SelectItem value="students">Students Only</SelectItem>
                                                <SelectItem value="teachers">Teachers Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Optional description..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddEvent} disabled={isSubmitting}>
                                    {isSubmitting ? "Adding..." : "Add Event"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calendar</CardTitle>
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
                                {date ? `Events for ${format(date, 'MMMM d, yyyy')}` : "All Events"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {(date ? selectedDateEvents : events).length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">No events on this date.</p>
                                    ) : (
                                        (date ? selectedDateEvents : events).map((event) => (
                                            <div key={event.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                                                <div className="flex gap-4">
                                                    <div className="text-center min-w-[3rem]">
                                                        <span className="block text-xl font-bold font-display text-primary">
                                                            {event.date.getDate()}
                                                        </span>
                                                        <span className="text-xs uppercase text-muted-foreground font-semibold">
                                                            {format(event.date, 'MMM')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{event.title}</h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <Badge variant="outline">{event.type}</Badge>
                                                            <Badge variant="secondary" className="capitalize">{event.visibility}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
