import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { StudentSidebar } from "./StudentSidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Video, X, Bell } from "lucide-react";

interface StudentLayoutProps {
    children: ReactNode;
    showTopBar?: boolean;
}

function UrgentNotificationPopup() {
    const [urgentNotifs, setUrgentNotifs] = useState<any[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        fetchUrgentNotifications();
    }, []);

    const fetchUrgentNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('notifications')
                .select('id, title, message, created_at, notification_type')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .or('notification_type.eq.urgent_live_update,priority.gte.5')
                .order('created_at', { ascending: false })
                .limit(10);

            if (data && data.length > 0) {
                setUrgentNotifs(data);
                setVisible(true);
            }
        } catch (err) {
            console.error("Error fetching urgent notifications:", err);
        }
    };

    const handleDismissAll = async () => {
        setVisible(false);
        // Mark all urgent notifications as read
        const ids = urgentNotifs.map(n => n.id);
        if (ids.length > 0) {
            await supabase.from('notifications').update({ is_read: true }).in('id', ids);
        }
    };

    if (!visible || urgentNotifs.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="relative w-full max-w-lg bg-background border-2 border-amber-500/60 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-red-500 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-white">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">🚨 Urgent Notifications</h2>
                            <p className="text-white/80 text-xs">{urgentNotifs.length} important update{urgentNotifs.length > 1 ? 's' : ''} require your attention</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismissAll}
                        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Notification List */}
                <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3 flex-1">
                    {urgentNotifs.map((notif) => (
                        <div
                            key={notif.id}
                            className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-2"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    {notif.notification_type === 'urgent_live_update' ? (
                                        <Video className="h-4 w-4 text-red-500" />
                                    ) : (
                                        <Bell className="h-4 w-4 text-amber-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-foreground leading-tight">{notif.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                                        {new Date(notif.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 shrink-0">
                    <button
                        onClick={handleDismissAll}
                        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        ✅ I've Read All Updates — Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}

export function StudentLayout({ children, showTopBar = true }: StudentLayoutProps) {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <StudentSidebar />
                <SidebarInset className="flex-1 flex flex-col min-w-0">
                    {showTopBar && <TopBar />}
                    <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto bg-background/50 pb-20 lg:pb-6">
                        <div className="max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
                            {children}
                        </div>
                    </main>
                    <MobileNav />
                </SidebarInset>
            </div>
            {/* Urgent notification popup on app load */}
            <UrgentNotificationPopup />
        </SidebarProvider>
    );
}

