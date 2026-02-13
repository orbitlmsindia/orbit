import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { StudentSidebar } from "./StudentSidebar";
import { TopBar } from "./TopBar";

interface StudentLayoutProps {
    children: ReactNode;
    showTopBar?: boolean;
}

export function StudentLayout({ children, showTopBar = true }: StudentLayoutProps) {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <StudentSidebar />
                <SidebarInset className="flex-1 flex flex-col min-w-0">
                    {showTopBar && <TopBar />}
                    <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background/50">
                        <div className="max-w-7xl mx-auto w-full space-y-6">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
