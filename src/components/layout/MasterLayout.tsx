import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MasterSidebar } from "./MasterSidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

interface MasterLayoutProps {
    children?: ReactNode;
    headerTitle?: string;
    headerDescription?: string;
    action?: ReactNode;
}

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function MasterLayout({ children, headerTitle, headerDescription, action }: MasterLayoutProps) {
    const [userEmail, setUserEmail] = useState("master@orbitlms.in");

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email) {
                setUserEmail(data.user.email);
            }
        });
    }, []);

    return (
        <SidebarProvider defaultOpen>
            <div className="min-h-screen bg-background w-full flex text-foreground">
                <MasterSidebar />
                <SidebarInset className="flex-1 flex flex-col relative w-full lg:w-[calc(100%-256px)] transition-all duration-300 ease-in-out overflow-x-hidden">
                    <TopBar userName="Master Admin" userEmail={userEmail} />
                    <main className="flex-1 overflow-x-hidden pt-4 pb-24 lg:pb-8 touch-pan-smooth">
                        <div className="px-3 sm:px-6 md:px-8 w-full max-w-[1600px] mx-auto animate-fade-in">
                            {(headerTitle || action) && (
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        {headerTitle && <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-1 sm:mb-2">{headerTitle}</h1>}
                                        {headerDescription && <p className="text-xs sm:text-sm text-muted-foreground">{headerDescription}</p>}
                                    </div>
                                    {action && <div className="shrink-0">{action}</div>}
                                </div>
                            )}
                            {children}
                        </div>
                    </main>
                    <MobileNav />
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}

