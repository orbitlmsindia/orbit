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
        <SidebarInset className="flex-1 flex flex-col">
          <TopBar userName="Admin User" userEmail="admin@orbit-jiet.edu" />
          <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background pb-20 lg:pb-6">
            {children}
          </main>
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
