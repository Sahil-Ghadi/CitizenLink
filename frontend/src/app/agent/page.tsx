"use client";
import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, Clock, FileText,
  ChevronRight, Flame, BarChart3, Sparkles, Zap,
  MapPin, Plus, TrendingUp, User2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { useAgentTickets } from "@/hooks/use-tickets";
import { StatusBadge, SeverityBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SEV_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string }> = {
  submitted: { dot: "bg-blue-400", label: "Submitted", pill: "bg-blue-400/10 text-blue-400" },
  "in-progress": { dot: "bg-amber-400", label: "In Progress", pill: "bg-amber-400/10 text-amber-400" },
  resolved: { dot: "bg-emerald-400", label: "Resolved", pill: "bg-emerald-400/10 text-emerald-400" },
  "auto-resolved": { dot: "bg-emerald-400", label: "Resolved", pill: "bg-emerald-400/10 text-emerald-400" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ResolutionRing({ pct }: { pct: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
      <motion.circle
        cx="36" cy="36" r={r} fill="none"
        stroke="rgb(52 211 153)" strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function AgentDashboard() {
  const router = useRouter();
  const { user } = useAppContext();
  const { tickets, loading } = useAgentTickets();

  const displayName = user?.displayName?.split(" ")[0] ?? "Agent";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "auto-resolved" && t.status !== "rejected");
  const inProgress = tickets.filter((t) => t.status === "in-progress");
  const emergency = tickets.filter((t) => t.severity === "emergency");
  const resolvedAll = tickets.filter((t) => t.status === "resolved" || t.status === "auto-resolved");
  const resolvedToday = resolvedAll.filter((t) => {
    const d = new Date(t.updated_at), n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const overdue = activeTickets.filter(
    (t) => (Date.now() - new Date(t.created_at).getTime()) > 72 * 3600000
  );

  const total = tickets.length;
  const resolutionRate = total > 0 ? Math.round((resolvedAll.length / total) * 100) : 0;

  const categoryCount: Record<string, number> = {};
  tickets.forEach((t) => { categoryCount[t.category] = (categoryCount[t.category] || 0) + 1; });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const statCards = [
    { label: "Open", value: activeTickets.length, icon: FileText, accent: "text-foreground", ring: "ring-border", bg: "bg-secondary/40" },
    { label: "In Progress", value: inProgress.length, icon: Clock, accent: "text-amber-400", ring: "ring-amber-500/20", bg: "bg-amber-500/5" },
    { label: "Resolved Today", value: resolvedToday.length, icon: CheckCircle2, accent: "text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-500/5" },
    { label: "Emergency", value: emergency.length, icon: AlertTriangle, accent: "text-red-400", ring: "ring-red-500/20", bg: "bg-red-500/5" },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-7">

        {/* Emergency banner */}
        {!loading && emergency.length > 0 && (
          <motion.div variants={item}
            className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
          >
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">🚨 {emergency.length} emergency ticket{emergency.length > 1 ? "s" : ""} need immediate attention</p>
              <p className="text-xs text-muted-foreground mt-0.5">{emergency[0]?.title}</p>
            </div>
            <button onClick={() => router.push("/agent/queue")}
              className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors shrink-0">
              View Now →
            </button>
          </motion.div>
        )}

        {/* Hero greeting */}
        <motion.div variants={item}
          className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent border border-accent/20">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">{greeting}</p>
              <h1 className="text-2xl font-display font-bold text-foreground">{displayName} 👋</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {loading
                  ? "Loading your dashboard…"
                  : activeTickets.length > 0
                    ? `${activeTickets.length} open ticket${activeTickets.length !== 1 ? "s" : ""} · ${overdue.length > 0 ? `${overdue.length} overdue` : `${resolvedToday.length} resolved today`}`
                    : "All tickets resolved! 🎉"}
              </p>
            </div>
            <Button
              onClick={() => router.push("/agent/queue")}
              className="rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 shrink-0"
            >
              <Plus className="w-4 h-4" /> Open Queue
            </Button>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`glass-card p-4 ring-1 ${s.ring} ${s.bg} relative overflow-hidden`}
            >
              <div className={`w-8 h-8 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.accent}`} />
              </div>
              {loading
                ? <div className="h-8 w-10 bg-secondary rounded-lg animate-pulse mb-1" />
                : <p className="text-3xl font-display font-bold text-foreground leading-none mb-1">{s.value}</p>
              }
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>



        {/* Priority Queue */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Priority Queue</h2>
              {!loading && activeTickets.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{activeTickets.length} open</p>
              )}
            </div>
            <button onClick={() => router.push("/agent/queue")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2.5 bg-secondary rounded w-1/4" />
                      <div className="h-3.5 bg-secondary rounded w-3/5" />
                      <div className="h-2.5 bg-secondary rounded w-2/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && activeTickets.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card p-10 text-center border border-emerald-500/20 bg-emerald-500/5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">All clear!</p>
              <p className="text-xs text-muted-foreground mt-1">No open tickets right now. 🎉</p>
            </motion.div>
          )}

          <div className="space-y-3">
            {activeTickets.slice(0, 5).map((ticket, i) => {
              const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG["submitted"];
              const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/agent/ticket/${ticket.id}`)}
                  className="glass-card p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{ticket.id}</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${sc.pill.split(" ").find(c => c.startsWith("text-"))}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${sevClass}`}>
                          {ticket.severity}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User2 className="w-3 h-3 shrink-0" />{ticket.citizen_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />{ticket.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />{timeAgo(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recently Resolved */}
        {!loading && resolvedAll.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">Recently Resolved</h2>
              <button onClick={() => router.push("/agent/queue")}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {resolvedAll.slice(0, 4).map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => router.push(`/agent/ticket/${ticket.id}`)}
                  className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-emerald-500 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                        {ticket.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>{ticket.citizen_name}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{ticket.department}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{timeAgo(ticket.updated_at)}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 shrink-0 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && total === 0 && (
          <motion.div variants={item}
            className="glass-card p-12 text-center border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No tickets yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs mx-auto">
              The queue is empty. Tickets submitted by citizens will appear here.
            </p>
          </motion.div>
        )}

      </motion.div>
    </>
  );
}
