import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Setup() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");

    const handleCreateAdmin = async () => {
        if (!email || !password || !fullName) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: 'admin', // Force admin role
                    }
                }
            });

            if (error) throw error;

            toast({ title: "Success", description: "Admin account created. You can now login." });
            navigate("/login");
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Initial Setup</CardTitle>
                    <CardDescription>Create your Admin account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Admin Name</Label>
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Admin Name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
                        </div>
                        <Button className="w-full" onClick={handleCreateAdmin} disabled={loading || !email || !password || !fullName}>
                            {loading ? <Loader2 className="animate-spin" /> : "Create Admin User"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
