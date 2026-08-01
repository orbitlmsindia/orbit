
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Notification {
    id: number | string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    user_id: string;
    notification_type?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: number | string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: number | string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    refetchInfo: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadCountRef = useRef(0);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: notifs, error } = await supabase
                .from('notifications')
                .select('id, title, message, is_read, created_at, user_id, notification_type')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            if (notifs) {
                setNotifications(notifs);
                const currentUnread = notifs.filter((n: Notification) => !n.is_read).length;
                
                if (currentUnread > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
                    const newest = notifs[0];
                    if (newest && !newest.is_read) {
                        toast({
                            title: `🔔 ${newest.title || "New Notification"}`,
                            description: newest.message
                        });
                    }
                }
                prevUnreadCountRef.current = currentUnread;
                setUnreadCount(currentUnread);
            }
        } catch (err) {
            console.error('Error in fetchNotifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        let channel: any = null;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel(`realtime-notifications-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        if (newNotif) {
                            toast({
                                title: `🔔 ${newNotif.title || "New Notification"}`,
                                description: newNotif.message
                            });
                            fetchNotifications();
                        }
                    }
                )
                .subscribe();
        };

        setupRealtime();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchNotifications();
                setupRealtime();
            } else if (event === 'SIGNED_OUT') {
                setNotifications([]);
                setUnreadCount(0);
                if (channel) supabase.removeChannel(channel);
            }
        });

        const interval = setInterval(fetchNotifications, 5000);

        return () => {
            clearInterval(interval);
            subscription.unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const markAsRead = async (id: number | string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
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

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const deleteNotification = async (id: number | string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => {
                const target = prev.find(n => n.id === id);
                if (target && !target.is_read) {
                    setUnreadCount(u => Math.max(0, u - 1));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            clearAllNotifications,
            refetchInfo: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
