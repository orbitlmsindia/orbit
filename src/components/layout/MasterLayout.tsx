import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MasterSidebar } from "./MasterSidebar";
import { TopBar } from "./TopBar";

interface MasterLayoutProps {
    children?: ReactNode;
    headerTitle?: string;
    headerDescription?: string;
    action?: ReactNode;
}

export function MasterLayout({ children, headerTitle, headerDescription, action }: MasterLayoutProps) {
    return (
        <SidebarProvider defaultOpen>
            <div className="min-h-screen bg-background w-full flex text-foreground">
                <MasterSidebar />
                <SidebarInset className="flex-1 flex flex-col relative w-full lg:w-[calc(100%-256px)] transition-all duration-300 ease-in-out">
                    <TopBar userName="Master Admin" userEmail="orbitadmin@orbit.com" />
                    <main className="flex-1 overflow-x-hidden pt-4">
                        <div className="px-4 py-8 md:px-8 w-full max-w-[1600px] mx-auto animate-fade-in pb-20">
                            <div className="mb-6 flex justify-between items-center">
                                <div>
                                    {headerTitle && <h1 className="text-3xl font-display font-bold tracking-tight mb-2">{headerTitle}</h1>}
                                    {headerDescription && <p className="text-muted-foreground">{headerDescription}</p>}
                                </div>
                                {action && <div>{action}</div>}
                            </div>
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
