import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 md:h-20 md:px-8 md:hidden">
      <SidebarTrigger className="size-8.5 shrink-0 [&_svg]:size-5!" />
    </header>
  );
}