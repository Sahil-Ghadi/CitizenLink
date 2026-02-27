"use client";
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, setRole } = useAppContext();
  const router = useRouter();

  const switchRole = (newRole: "citizen" | "agent") => {
    setRole(newRole);
    router.push(newRole === "citizen" ? "/dashboard" : "/agent");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            <div className="flex items-center gap-3">
              {/* Role switcher */}
              <div className="flex items-center bg-secondary rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => switchRole("citizen")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${role === "citizen" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Citizen
                </button>
                <button
                  onClick={() => switchRole("agent")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${role === "agent" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Agent
                </button>
              </div>
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
