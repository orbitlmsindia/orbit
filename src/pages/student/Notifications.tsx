import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function StudentNotifications() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: notifs, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(notifs || []);
        } catch (error: any) {
            console.error("Error fetching notifications:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (error: any) {
            console.error("Error marking as read:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast({ title: "Success", description: "All notifications marked as read." });
        } catch (error: any) {
            console.error("Error marking all as read:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <StudentLayout>
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Your Notifications</h1>
                        <p className="text-muted-foreground mt-1">
                            Stay up to date with your courses and assignments.
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead} className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Bell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{notifications.length}</p>
                                <p className="text-sm text-muted-foreground">Total</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-500/10">
                                <Bell className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{unreadCount}</p>
                                <p className="text-sm text-muted-foreground">Unread</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {notifications.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No notifications yet</p>
                                <p className="text-sm mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 flex flex-col md:flex-row gap-4 justify-between transition-colors hover:bg-muted/50 ${!notif.is_read ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`p-2 rounded-full h-fit shrink-0 ${!notif.is_read ? 'bg-primary/20' : 'bg-muted'}`}>
                                                <Bell className={`h-5 w-5 ${!notif.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-semibold ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    {!notif.is_read && (
                                                        <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {!notif.is_read && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="shrink-0 md:self-center"
                                                onClick={() => markAsRead(notif.id)}
                                            >
                                                Mark as read
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </StudentLayout>
    );
}
