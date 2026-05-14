import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, CreditCard, Activity, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MasterDashboard() {
    const [stats, setStats] = useState({
        colleges: 0,
        totalUsers: 0,
        revenue: 0,
        activeSubscriptions: 0
    });

    useEffect(() => {
        // Demo data for now, would fetch from Supabase
        const fetchStats = async () => {
            const { count: collCount } = await supabase.from('colleges').select('*', { count: 'exact', head: true });
            const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

            setStats({
                colleges: collCount || 0,
                totalUsers: usersCount || 0,
                revenue: 12500,
                activeSubscriptions: collCount || 0
            });
        };
        fetchStats();
    }, []);

    return (
        <MasterLayout
            headerTitle="Master Dashboard"
            headerDescription="Global overview across all SaaS tenants"
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.colleges}</div>
                        <p className="text-xs text-muted-foreground">+2 from last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Platform Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+5% from last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                        <p className="text-xs text-muted-foreground">0 pending defaults</p>
                    </CardContent>
                </Card>
            </div>
        </MasterLayout>
    );
}
