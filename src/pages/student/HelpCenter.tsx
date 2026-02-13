import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, Phone, Building2, GraduationCap, Ticket, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentHelpCenter() {
    const { toast } = useToast();
    const [ticket, setTicket] = useState({
        subject: "",
        category: "",
        description: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const handleTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            const { error } = await supabase
                .from('tickets')
                .insert([{
                    user_id: user.id,
                    subject: ticket.subject,
                    category: ticket.category,
                    description: ticket.description,
                    status: 'open',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            toast({
                title: "Ticket Raised Successfully",
                description: "Your support ticket has been sent to the admin team.",
            });
            setTicket({ subject: "", category: "", description: "" });
        } catch (error: any) {
            console.error("Error submitting ticket:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to submit ticket. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const faqs = [
        {
            question: "How do I submit an assignment?",
            answer: "Go to the Assignments tab in the sidebar. Click on the assignment you want to submit, upload your file, and click 'Submit'."
        },
        {
            question: "Where can I view my grades?",
            answer: "Navigate to the 'Grades & Results' section. You'll see a breakdown of your scores for all completed quizzes and assignments."
        },
        {
            question: "How do I access course materials?",
            answer: "Click on 'My Courses' to see all enrolled courses. Click 'Continue Learning' to access video lessons and PDF resources."
        },
        {
            question: "Can I contact my teacher?",
            answer: "Yes, you can find your teacher's contact info in the Course Details page, or send a message if enabled by your institute."
        },
        {
            question: "What if I forget my password?",
            answer: "On the login page, click 'Forgot Password'. You'll receive a reset link to your registered email address."
        }
    ];

    return (
        <StudentLayout>
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-display font-bold">Help Center</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Find answers to common questions and get support for your learning journey.
                    </p>
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Search for help..." />
                    </div>
                </div>

                {/* Ticket Raising Section */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" /> Raise a Ticket
                        </CardTitle>
                        <CardDescription>
                            Facing an issue? Describe it below and our admin team will resolve it. Only admins can view this ticket.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleTicketSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Input
                                        placeholder="Brief summary of the issue"
                                        value={ticket.subject}
                                        onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={ticket.category}
                                        onValueChange={(val) => setTicket({ ...ticket, category: val })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="technical">Technical Issue</SelectItem>
                                            <SelectItem value="academic">Academic Query</SelectItem>
                                            <SelectItem value="account">Account & Login</SelectItem>
                                            <SelectItem value="billing">Fees & Billing</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="Please provide details about the issue..."
                                    className="min-h-[100px]"
                                    value={ticket.description}
                                    onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={submitting} className="gap-2">
                                    <Send className="h-4 w-4" />
                                    {submitting ? "Submitting..." : "Submit Ticket"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" /> Contact Support
                            </CardTitle>
                            <CardDescription>Get in touch with our support team.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Need technical assistance? Email us directly.
                            </p>
                            <Button variant="outline" className="w-full">
                                orbitlmsindia@gmail.com
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Phone className="h-5 w-5 text-primary" /> Institute Hotline
                            </CardTitle>
                            <CardDescription>Call your institute admin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Available during school hours.
                            </p>
                            <Button variant="outline" className="w-full" disabled>
                                -
                            </Button>
                        </CardContent>
                    </Card>
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
        </StudentLayout>
    );
}
