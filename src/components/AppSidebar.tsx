import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Home,
  ClipboardCheck,
  BarChart3,
  FileText,
  Users,
  Settings,
  Leaf,
  PlusCircle,
  CalendarClock,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/useAuth";

type Item = { title: string; to: string; icon: any; roles: AppRole[] };

const NAV: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["admin", "bhw", "viewer"] },
      { title: "Analytics", to: "/analytics", icon: BarChart3, roles: ["admin", "bhw", "viewer"] },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Households", to: "/households", icon: Home, roles: ["admin", "bhw", "viewer"] },
      { title: "Evaluations", to: "/evaluations", icon: ClipboardCheck, roles: ["admin", "bhw", "viewer"] },
      { title: "New Evaluation", to: "/evaluations/new", icon: PlusCircle, roles: ["admin", "bhw"] },
      { title: "Follow-ups", to: "/follow-ups", icon: CalendarClock, roles: ["admin", "bhw", "viewer"] },
      { title: "Reports", to: "/reports", icon: FileText, roles: ["admin", "bhw", "viewer"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "User Management", to: "/users", icon: Users, roles: ["admin"] },
      { title: "Settings", to: "/settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const { role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">BSHCES</p>
            <p className="truncate text-xs text-muted-foreground">Sambulawan Portal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter((i) => role && i.roles.includes(role));
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={pathname === item.to}>
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}