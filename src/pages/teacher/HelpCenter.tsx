import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, GraduationCap } from "lucide-react";

export default function TeacherHelpCenter() {
    const faqs = [
        {
            question: "How do I create a new assignment?",
            answer: "Go to the Assignments page and click 'Create Assignment'. Fill in the details, attach files if necessary, and assign it to a course."
        },
        {
            question: "How can I grade student submissions?",
            answer: "Navigate to the 'Reviews' section. You'll see a list of pending submissions. Click on one to view, grade, and provide feedback."
        },
        {
            question: "How do I add modules to my course?",
            answer: "In the 'Courses' section, select the course you want to edit. Click 'Add Module' to structure your content."
        },
        {
            question: "Can I track student attendance?",
            answer: "Yes, use the 'Attendance' tab specifically designed for marking and reviewing student attendance records."
        },
        {
            question: "How do I update my profile?",
            answer: "Go to Settings -> Profile to update your bio, contact information, and avatar."
        }
    ];

    return (
        <TeacherLayout>
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-display font-bold">Help Center</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Resources and support to help you manage your courses effectively.
                    </p>
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Search for help..." />
                    </div>
                </div>

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
                                <Phone className="h-5 w-5 text-primary" /> Admin Support
                            </CardTitle>
                            <CardDescription>Contact your institute admin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                For urgent institute-related queries.
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
        </TeacherLayout>
    );
}
