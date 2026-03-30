import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
        
        // Single optimized C-Core PostgreSQL request returns all 4 datasets
        const { data, error } = await supabase.rpc('get_master_analytics', {
            p_timeframe: timeframe,
            p_college_id: targetCollegeId
        });

        if (!error && data) {
            setAnalytics(data);
        }
    };

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
            headerDescription="In-depth graphical reports optimized for large datasets."
            action={
                <div className="flex gap-4">
                    <Select value={timeframe} onValueChange={(val:any) => setTimeframe(val)}>
                        <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Timeframe" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                        <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Filter by Tenant" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Global (All Tenants)</SelectItem>
                            {colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            }
        >
            {!analytics ? (
                <div className="flex h-64 w-full items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* 1. College Growth (Only relevant if Global) */}
                    {selectedCollege === 'all' && (
                        <Card className="p-2 md:col-span-2 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle>Tenant Adoption Rate</CardTitle>
                                <CardDescription>New SaaS sub-instances provisioned over time.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics.college_growth}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="period_label" axisLine={false} tickLine={false} tickMargin={10} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" name="New Colleges Enrolled" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. Student Growth */}
                    <Card className="p-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>User Acquisition Curve</CardTitle>
                            <CardDescription>Accounts provisioned as 'student' role.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.student_growth}>
                                    <XAxis dataKey="period_label" />
                                    <YAxis />
                                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                    <Bar dataKey="total" name="Students Added" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3. Revenue Line */}
                    <Card className="p-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>Billed Invoices Revenue</CardTitle>
                            <CardDescription>Confirmed paid invoices collected.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.revenue}>
                                    <XAxis dataKey="period_label" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => [`$${val}`, "Revenue"]} />
                                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 4. Course Popularity */}
                    <Card className="p-2 md:col-span-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>Course Popularity Matrix</CardTitle>
                            <CardDescription>Most enrolled modules {selectedCollege !== 'all' ? 'inside this tenant' : 'across all tenants'}.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.course_popularity} layout="vertical" margin={{ left: 100 }}>
                                    <XAxis type="number" />
                                    <YAxis dataKey="course_title" type="category" width={150} tick={{fontSize: 12}} />
                                    <Tooltip />
                                    <Bar dataKey="enrollment_count" name="Total Seats" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                </div>
            )}
        </MasterLayout>
    );
}
