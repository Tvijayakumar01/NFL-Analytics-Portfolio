import { NavLink, useLocation } from "react-router-dom";
import { Newspaper, Users, CalendarDays, Target, BookOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  name: string;
  href: string;
  icon: typeof Newspaper;
  end?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    label: "Analytics",
    items: [
      { name: "This Week", href: "/", icon: Newspaper, end: true },
      { name: "Teams", href: "/teams", icon: Users },
      { name: "Schedule", href: "/schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Predictions", href: "/predictions", icon: Target },
      { name: "Method", href: "/method", icon: BookOpen },
    ],
  },
];

const menuButtonClassName =
  "h-11 gap-2.5 rounded-lg px-3 text-base text-sidebar-foreground/70 transition-colors " +
  "aria-[current=page]:bg-pos aria-[current=page]:font-medium aria-[current=page]:text-ink " +
  "[&_svg]:size-5! " +
  "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden";

function NavItemLink({ item }: { item: NavItem }) {
  const location = useLocation();
  const isActive = item.end ? location.pathname === "/" : location.pathname.startsWith(item.href);

  return (
    <SidebarMenuButton asChild tooltip={item.name} className={menuButtonClassName}>
      <NavLink to={item.href} end={item.end} aria-current={isActive ? "page" : undefined}>
        <item.icon />
        <span>{item.name}</span>
      </NavLink>
    </SidebarMenuButton>
  );
}

function CollapseControl() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
    </button>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="h-full border-none">
      <SidebarHeader
        className={`h-16 flex-row items-center border-b border-sidebar-border transition-[padding] md:h-20 ${
          collapsed ? "justify-start px-3" : "justify-between gap-4 px-4"
        }`}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xl">🏈</span>
            <span className="truncate text-lg font-bold">NFL EPA Lab</span>
          </div>
        )}
        <CollapseControl />
      </SidebarHeader>

      <SidebarContent className="gap-4 overflow-x-hidden overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="gap-2 p-0">
            <SidebarGroupLabel className="h-auto px-3 py-1 text-sm font-normal text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <NavItemLink item={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}