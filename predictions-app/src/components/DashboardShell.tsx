import type { CSSProperties, ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
}