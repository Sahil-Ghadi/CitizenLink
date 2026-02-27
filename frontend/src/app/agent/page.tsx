"use client";
import { motion } from "framer-motion";
import { Clock, CheckCircle, AlertTriangle, TrendingUp, Zap, MapPin, BarChart3, Loader2 } from "lucide-react";
import { StatusBadge, SeverityBadge, AiBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { useAgentTickets } from "@/hooks/use-tickets";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const AgentDashboard = () => {
  const router = useRouter();
  const { user } = useAppContext();
  const { tickets, loading } = useAgentTickets();

  const emergencyTickets = tickets.filter((t) => t.severity === "emergency");
  const activeTickets = tickets.filter((t) => t.status !== "resolved");
  const resolvedToday = tickets.filter((t) => {
    if (t.status !== "resolved") return false;
    const updated = new Date(t.updated_at);
    const today = new Date();
    return (
      updated.getDate() === today.getDate() &&
      updated.getMonth() === today.getMonth() &&
      updated.getFullYear() === today.getFullYear()
    );
  });

  const overdueTickets = tickets.filter((t) => {
    if (t.status === "resolved") return false;
    const created = new Date(t.created_at);
    const hoursOpen = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    return hoursOpen > 72; // >3 days = overdue
  });

  const stats = [
    { label: "Active Tickets", value: loading ? "…" : activeTickets.length, icon: BarChart3, color: "text-foreground" },
    { label: "Resolved Today", value: loading ? "…" : resolvedToday.length, icon: CheckCircle, color: "text-status-resolved" },
    { label: "Emergency", value: loading ? "…" : emergencyTickets.length, icon: Zap, color: "text-destructive" },
    { label: "Overdue (>3d)", value: loading ? "…" : overdueTickets.length, icon: AlertTriangle, color: "text-destructive" },
  ];

  const displayName = user?.displayName?.split(" ")[0] ?? "Agent";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
      {/* Emergency Banner */}
      {!loading && emergencyTickets.length > 0 && (
        <motion.div variants={item} className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">🚨 Emergency Alert</p>
            <p className="text-xs text-muted-foreground">{emergencyTickets.length} emergency ticket(s) require immediate attention</p>
          </div>
          <button onClick={() => router.push("/agent/queue")} className="text-xs font-semibold text-destructive hover:underline">View Now →</button>
        </motion.div>
      )}

      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground">Welcome, {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="ml-2">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <span className="text-3xl font-bold text-foreground font-display">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : s.value}
            </span>
          </div>
        ))}
      </motion.div>

      {/* AI Workload + Heatmap */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Workload Summary</span>
            <AiBadge />
          </div>
          {loading ? (
            <div className="h-10 animate-pulse bg-secondary rounded-xl" />
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{activeTickets.length} open tickets.</span>{" "}
              {overdueTickets.length > 0 && `${overdueTickets.length} overdue. `}
              {emergencyTickets[0] && (
                <>Start with <span className="font-mono text-foreground">{emergencyTickets[0].id}</span> (emergency).</>
              )}
            </p>
          )}
          <button onClick={() => router.push("/agent/queue")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            View Queue →
          </button>
        </div>

        {/* Heatmap placeholder */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Area Heatmap</span>
            <AiBadge />
          </div>
          <div className="h-32 bg-secondary rounded-xl flex items-center justify-center relative overflow-hidden">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <circle cx="60" cy="40" r="18" fill="hsl(0 72% 51% / 0.3)" />
              <circle cx="60" cy="40" r="8" fill="hsl(0 72% 51% / 0.6)" />
              <circle cx="120" cy="55" r="14" fill="hsl(43 96% 50% / 0.3)" />
              <circle cx="120" cy="55" r="6" fill="hsl(43 96% 50% / 0.6)" />
              <circle cx="150" cy="30" r="10" fill="hsl(217 91% 60% / 0.3)" />
              <circle cx="150" cy="30" r="4" fill="hsl(217 91% 60% / 0.6)" />
              <circle cx="40" cy="70" r="12" fill="hsl(25 95% 53% / 0.3)" />
              <circle cx="40" cy="70" r="5" fill="hsl(25 95% 53% / 0.6)" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Recent Queue */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Priority Queue</h2>
          <button onClick={() => router.push("/agent/queue")} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">View All →</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-3 bg-secondary rounded w-24 mb-2" />
                <div className="h-4 bg-secondary rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {activeTickets.slice(0, 4).map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => router.push(`/agent/ticket/${ticket.id}`)}
                className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                      <SeverityBadge severity={ticket.severity} />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">Score: {ticket.priority_score}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ticket.citizen_name} • {ticket.department}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {Math.ceil((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60))}h ago
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            {activeTickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No active tickets 🎉</div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AgentDashboard;
