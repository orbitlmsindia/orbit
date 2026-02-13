import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, GraduationCap, Ticket, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TicketType {
    id: string;
    subject: string;
    category: string;
    description: string;
    status: string;
    created_at: string;
    user_id: string;
    users?: {
        email: string;
    };
}

export default function HelpCenter() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    users:user_id (email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            // Fallback if join fails or table issue
            const { data: simpleData, error: simpleError } = await supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (simpleData) setTickets(simpleData);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: 'resolved' })
                .eq('id', id);

            if (error) throw error;

            toast({ title: "Ticket Resolved", description: "The ticket has been marked as closed." });
            fetchTickets();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const faqs = [
        {
            question: "How do I add a new student?",
            answer: "Go to User Management -> Add User. Fill in the student's email, name, and role. They will receive an email to set their password."
        },
        {
            question: "How do I create a new course?",
            answer: "Navigate to Course Management -> Add Course. Provide a title and description. Once created, you can add modules and lessons."
        },
        {
            question: "Can I manage teacher permissions?",
            answer: "Yes, admins can promote users to teachers or admins in the User Management section. Teachers have restricted access to only their courses."
        },
        {
            question: "Where can I see student progress?",
            answer: "The Monitoring dashboard provides an overview of student progress, attendance, and assignment submissions."
        },
        {
            question: "How do I reset a user's password?",
            answer: "In User Management, find the user and click 'Edit'. There you can trigger a password reset email."
        }
    ];

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-5xl mx-auto pb-12">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-display font-bold">Help Center & Support</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Manage student tickets and find answers to common questions.
                    </p>
                </div>

                {/* Tickets Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" /> Recent Tickets
                        </h2>
                        <Button variant="outline" size="sm" onClick={fetchTickets}>
                            Refresh
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                No tickets found. great job!
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {tickets.map((ticket) => (
                                <Card key={ticket.id} className="overflow-hidden">
                                    <div className="p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={ticket.status === 'resolved' ? "secondary" : "destructive"}>
                                                    {ticket.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-sm font-medium">
                                                    • {ticket.users?.email || "Unknown User"}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                [{ticket.category}] {ticket.description}
                                            </p>
                                        </div>
                                        {ticket.status !== 'resolved' && (
                                            <Button onClick={() => handleResolve(ticket.id)} size="sm" className="gap-2 shrink-0">
                                                <CheckCircle className="h-4 w-4" /> Resolve
                                            </Button>
                                        )}
                                        {ticket.status === 'resolved' && (
                                            <Button variant="ghost" size="sm" className="gap-2 shrink-0 text-green-600 cursor-default hover:text-green-600 hover:bg-green-50">
                                                <CheckCircle className="h-4 w-4" /> Resolved
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" /> Sin Technologies
                            </CardTitle>
                            <CardDescription>Technical Partner</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Powered by Sin Technologies. Delivering innovative software solutions for modern education.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" /> JIET College
                            </CardTitle>
                            <CardDescription>Academic Collaboration</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                In association with Jodhpur Institute of Engineering and Technology (JIET) to foster academic growth.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
