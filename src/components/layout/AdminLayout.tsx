import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <TopBar userName="Admin User" userEmail="admin@orbitlms.edu" />
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto bg-background/50 pb-24 lg:pb-8 touch-pan-smooth">
            {children}
          </main>
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
