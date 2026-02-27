import {
  LayoutDashboard, FileText, PlusCircle, ListTodo, Users, ClipboardCheck, 
  Settings, Shield, LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAppContext } from "@/context/AppContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const citizenItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Report Issue", url: "/report", icon: PlusCircle },
  { title: "My Tickets", url: "/tickets", icon: FileText },
];

const agentItems = [
  { title: "Dashboard", url: "/agent", icon: LayoutDashboard },
  { title: "Ticket Queue", url: "/agent/queue", icon: ListTodo },
  { title: "Team", url: "/agent/team", icon: Users },
];

export function AppSidebar() {
  const { role, setIsLoggedIn } = useAppContext();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const items = role === "citizen" ? citizenItems : agentItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          {!collapsed && (
            <div className="px-4 pb-4 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">CitizenPortal</h2>
                  <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Gov • Services</p>
                </div>
              </div>
            </div>
          )}
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            {role === "citizen" ? "Citizen" : "Agent"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
