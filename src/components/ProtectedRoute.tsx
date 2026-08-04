import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const verifyAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (isMounted) {
                    setSession(null);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) setSession(session);
            
            // Authorization check for Admin & Finance panels
            if (location.pathname.startsWith('/admin')) {
                const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
                if (user?.role === 'admin' || user?.role === 'super_admin') {
                    if (isMounted) setIsAuthorized(true);
                } else {
                    const token = sessionStorage.getItem('impersonationToken');
                    const collegeId = sessionStorage.getItem('collegeId');
                    if (token && collegeId) {
                        const { data: isValid, error } = await supabase.rpc('verify_impersonation', { 
                            p_token: token, 
                            p_college_id: collegeId 
                        });
                        if (isValid && !error) {
                            if (isMounted) setIsAuthorized(true);
                        } else {
                            if (isMounted) setIsAuthorized(false);
                        }
                    } else {
                        if (isMounted) setIsAuthorized(false);
                    }
                }
            } else if (location.pathname.startsWith('/finance')) {
                const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
                if (user?.role === 'finance' || user?.role === 'admin' || user?.role === 'super_admin') {
                    if (isMounted) setIsAuthorized(true);
                } else {
                    if (isMounted) setIsAuthorized(false);
                }
            } else {
                if (isMounted) setIsAuthorized(true);
            }
            
            if (isMounted) setLoading(false);
        };
        
        verifyAccess();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setSession(session);
                // Simple re-render trigger, full verify happens on load/navigation
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (location.pathname.startsWith('/admin') && !isAuthorized) {
        return <Navigate to="/student" replace />; // Unauthorized users are redirected
    }

    return <>{children}</>;
}
