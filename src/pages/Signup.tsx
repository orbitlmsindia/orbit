import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { MoveLeft } from "lucide-react";

export default function Signup() {
    return (
        <AuthLayout
            title="Registration Restricted"
            subtitle="Self-registration is disabled for this platform."
        >
            <div className="space-y-6 text-center">
                <div className="p-4 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-900">
                    <p className="text-sm">
                        To ensure security and proper data isolation, user accounts are created and managed exclusively by Institute Administrators.
                    </p>
                </div>

                <p className="text-muted-foreground text-sm">
                    If you are a student or teacher, please contact your school's IT department or administrator to receive your login credentials.
                </p>

                <Link to="/login" className="block w-full">
                    <Button className="w-full gap-2" variant="outline">
                        <MoveLeft className="h-4 w-4" /> Back to Login
                    </Button>
                </Link>
            </div>
        </AuthLayout>
    );
}
