import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import AccessDenied from "@/pages/AccessDenied";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCollegeSuspended, setIsCollegeSuspended] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("student");
    const [requiredRoleName, setRequiredRoleName] = useState<string>("Authorized Role");
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const verifyAccess = async () => {
            const isMasterStaffActive = sessionStorage.getItem('isMasterStaff') === 'true';
            const { data: { session } } = await supabase.auth.getSession();

            // If navigating to /master and delegated staff session is active, allow through
            if (!session && isMasterStaffActive && location.pathname.startsWith('/master')) {
                if (isMounted) {
                    setSession({ user: { email: "staff@orbitlms.in" } });
                    setCurrentUserRole("master_staff");
                    setIsAuthorized(true);
                    setLoading(false);
                }
                return;
            }

            if (!session) {
                if (isMounted) {
                    setSession(null);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) setSession(session);
            
            // Resolve user role with database lookup, JWT claims, and session storage fallbacks
            let userRole: string | null = null;
            let userStatus: string | null = null;
            let collegeId: string | null = sessionStorage.getItem('collegeId');

            try {
                const { data: user } = await supabase.from('users').select('role, status, college_id').eq('id', session.user.id).maybeSingle();
                if (user?.role) userRole = user.role.toLowerCase();
                if (user?.status) userStatus = user.status;
                if (user?.college_id) collegeId = user.college_id;
            } catch (err) {
                console.warn("Could not query role from users table directly, checking claims:", err);
            }

            // Fallbacks for role
            if (!userRole) {
                userRole = (
                    session.user.app_metadata?.user_role ||
                    session.user.user_metadata?.role ||
                    sessionStorage.getItem('userRole') ||
                    'student'
                ).toLowerCase();
            }

            if (userRole) {
                sessionStorage.setItem('userRole', userRole);
                if (isMounted) setCurrentUserRole(userRole);
            }
            if (collegeId) {
                sessionStorage.setItem('collegeId', collegeId);
            }

            const isMasterRole = userRole === 'super_admin' || userRole === 'master_admin' || userRole === 'master_staff' || isMasterStaffActive;

            // Check if tenant college has been turned OFF by Master Admin
            if (!isMasterRole && collegeId) {
                try {
                    const { data: college } = await supabase
                        .from('colleges')
                        .select('activation_status')
                        .eq('id', collegeId)
                        .maybeSingle();

                    if (college && college.activation_status === false) {
                        if (isMounted) {
                            setIsCollegeSuspended(true);
                            setLoading(false);
                        }
                        return;
                    }
                } catch (e) {
                    console.warn("College status check notice:", e);
                }
            }

            const isAdminRole = userRole === 'admin' || userRole === 'super_admin' || userRole === 'master_admin';
            const isTeacherRole = userRole === 'teacher';
            const isFinanceRole = userRole === 'finance';
            const isStudentRole = userRole === 'student';

            // Authorization check per route prefix
            if (location.pathname.startsWith('/master')) {
                if (isMounted) setRequiredRoleName("Master SaaS Administrator");
                if (isMasterRole) {
                    if (isMounted) setIsAuthorized(true);
                } else {
                    if (isMounted) setIsAuthorized(false);
                }
            } else if (location.pathname.startsWith('/admin')) {
                if (isMounted) setRequiredRoleName("Institutional Administrator");
                if (isAdminRole) {
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
                if (isMounted) setRequiredRoleName("Finance Officer");
                if (isFinanceRole || isAdminRole) {
                    if (isMounted) setIsAuthorized(true);
                } else {
                    if (isMounted) setIsAuthorized(false);
                }
            } else if (location.pathname.startsWith('/teacher')) {
                if (isMounted) setRequiredRoleName("Teacher / Faculty");
                if (isTeacherRole || isAdminRole) {
                    if (isMounted) setIsAuthorized(true);
                } else {
                    if (isMounted) setIsAuthorized(false);
                }
            } else if (location.pathname.startsWith('/student')) {
                if (isMounted) setRequiredRoleName("Student / Learner");
                if (isStudentRole || isAdminRole || isTeacherRole) {
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
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        if (location.pathname.startsWith('/master')) {
            return <Navigate to="/master/login" state={{ from: location }} replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isCollegeSuspended) {
        return <Navigate to="/service-maintenance" replace />;
    }

    // Role-specific restriction display
    if (!isAuthorized) {
        return (
            <AccessDenied
                requiredRole={requiredRoleName}
                currentRole={currentUserRole}
                userEmail={session?.user?.email}
            />
        );
    }

    return <>{children}</>;
}
