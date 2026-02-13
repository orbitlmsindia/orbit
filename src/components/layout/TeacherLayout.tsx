import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "./TeacherSidebar";
import { TopBar } from "./TopBar"; // Reusing TopBar for now, might need custom one later

interface TeacherLayoutProps {
    children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <TeacherSidebar />
                <SidebarInset className="flex-1 flex flex-col min-w-0">
                    <TopBar />
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
