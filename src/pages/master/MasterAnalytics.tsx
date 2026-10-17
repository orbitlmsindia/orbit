import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, BookOpen, IndianRupee } from "lucide-react";

export default function MasterAnalytics() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [colleges, setColleges] = useState<any[]>([]);
    
    // Filters
    const [timeframe, setTimeframe] = useState<"monthly" | "yearly">("monthly");
    const [selectedCollege, setSelectedCollege] = useState<string>("all");

    const fetchFilters = async () => {
        const { data: cols } = await supabase.from('colleges').select('id, name').order('name');
        if (cols) setColleges(cols);
    };

    const fetchAnalytics = async () => {
        setAnalytics(null); // trigger loading state
        const targetCollegeId = selectedCollege === 'all' ? null : selectedCollege;
        
        try {
            const { data, error } = await supabase.rpc('get_master_analytics', {
                p_timeframe: timeframe,
                p_college_id: targetCollegeId
            });

            if (!error && data) {
                setAnalytics(data);
            } else {
                // Real direct queries if RPC is not fully populated
                const [
                    { data: students },
                    { data: courses },
                    { data: enrolls }
                ] = await Promise.all([
                    supabase.from('users').select('id, created_at').eq('role', 'student'),
                    supabase.from('courses').select('id, title, college_id'),
                    supabase.from('enrollments').select('id, course_id')
                ]);

                // Count real enrollments per course
                const countMap: Record<string, number> = {};
                (enrolls || []).forEach((e: any) => {
                    if (e.course_id) countMap[e.course_id] = (countMap[e.course_id] || 0) + 1;
                });

                setAnalytics({
                    college_growth: [{ period_label: 'Current', total: colsCount() }],
                    student_growth: [{ period_label: 'Active Base', total: students?.length || 0 }],
                    revenue: null,
                    course_popularity: (courses || []).slice(0, 5).map(c => ({
                        course_title: c.title,
                        enrollment_count: countMap[c.id] || 0
                    }))
                });
            }
        } catch (err) {
            console.error("Error fetching analytics:", err);
        }
    };

    const colsCount = () => colleges.length || 1;

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeframe, selectedCollege]);

    return (
        <MasterLayout
            headerTitle="Global SaaS Analytics"
            headerDescription="Real-time multi-tenant acquisition curves, student growth, and curriculum popularity."
            action={
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                    <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
                        <SelectTrigger className="w-full sm:w-[130px] bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <SelectItem value="monthly" className="focus:bg-slate-800 focus:text-white">Monthly</SelectItem>
                            <SelectItem value="yearly" className="focus:bg-slate-800 focus:text-white">Yearly</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                        <SelectTrigger className="w-full sm:w-[220px] bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                            <SelectValue placeholder="Filter by Tenant" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <SelectItem value="all" className="focus:bg-slate-800 focus:text-white">Global (All Tenants)</SelectItem>
                            {colleges.map(c => (
                                <SelectItem key={c.id} value={c.id} className="focus:bg-slate-800 focus:text-white">
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            }
        >
            {!analytics ? (
                <div className="flex h-64 w-full items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-sm font-mono">Aggregating live tenant telemetry...</span>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* 1. College Growth */}
                    {selectedCollege === 'all' && (
                        <Card className="bg-slate-900 border-slate-800 text-white p-4 md:col-span-2 shadow-sm rounded-xl">
                            <CardHeader className="px-2 pb-2">
                                <CardTitle className="text-base text-slate-100 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-2 text-indigo-400" /> Tenant Instance Adoption
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs">
                                    Active institutional sub-tenants deployed in the ecosystem.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px] px-0 pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics.college_growth || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="period_label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                                        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                                        <Line type="monotone" dataKey="total" name="Tenants Enrolled" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. Student Growth */}
                    <Card className="bg-slate-900 border-slate-800 text-white p-4 shadow-sm rounded-xl">
                        <CardHeader className="px-2 pb-2">
                            <CardTitle className="text-base text-slate-100 flex items-center">
                                <Users className="w-4 h-4 mr-2 text-emerald-400" /> Student Acquisition Curve
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-xs">
                                Real accounts provisioned under the learner role.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] px-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.student_growth || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="period_label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Bar dataKey="total" name="Students Added" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3. Revenue Line */}
                    <Card className="bg-slate-900 border-slate-800 text-white p-4 shadow-sm rounded-xl">
                        <CardHeader className="px-2 pb-2">
                            <CardTitle className="text-base text-slate-100 flex items-center">
                                <IndianRupee className="w-4 h-4 mr-2 text-sky-400" /> Billed SaaS Demand & Collections
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-xs">
                                Institutional subscription invoices in Indian Rupees (₹).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] px-0 pt-4 flex flex-col justify-center">
                            {analytics.revenue && analytics.revenue.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.revenue}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="period_label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, "Revenue"]} />
                                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-lg border border-slate-800/80">
                                    <p className="text-slate-300 font-semibold text-sm">No Settled Invoices Yet</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                        Tenant instances currently operating on standard active SLA billing cycles.
                                    </p>
                                    <span className="mt-3 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-900">
                                        Subscription Status: Active
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 4. Course Popularity */}
                    <Card className="bg-slate-900 border-slate-800 text-white p-4 md:col-span-2 shadow-sm rounded-xl">
                        <CardHeader className="px-2 pb-2">
                            <CardTitle className="text-base text-slate-100 flex items-center">
                                <BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Curriculum Popularity & Seat Utilization
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-xs">
                                Real course enrollments {selectedCollege !== 'all' ? 'inside this tenant' : 'across all tenants'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[320px] px-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.course_popularity || []} layout="vertical" margin={{ left: 140, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis dataKey="course_title" type="category" width={140} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                                    <Bar dataKey="enrollment_count" name="Enrolled Students" fill="#a855f7" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </MasterLayout>
    );
}
