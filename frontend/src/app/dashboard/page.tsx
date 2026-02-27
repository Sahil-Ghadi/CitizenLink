"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock, FileText,
  ArrowRight, Plus, Loader2, MapPin, ChevronRight,
  Flame, BarChart3, Star
} from "lucide-react";
import { AiBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { getIdToken } from "@/lib/auth";
import TicketDetailModal from "@/components/shared/TicketDetailModal";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const SEV_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-500/10 border-red-500/25",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  low: "text-green-400 bg-green-500/10 border-green-500/25",
};

const STATUS_DOT: Record<string, string> = {
  submitted: "bg-blue-400",
  "in-progress": "bg-amber-400",
  resolved: "bg-emerald-400",
  emergency: "bg-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted", "in-progress": "In Progress", resolved: "Resolved", emergency: "Emergency",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CitizenDashboard() {
  const router = useRouter();
  const { user } = useAppContext();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const displayName = user?.displayName?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await getIdToken();
        const res = await fetch(`${BACKEND_URL}/tickets/my`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTickets(data);
        }
      } catch { /* backend offline — show empty state */ }
      finally { setLoading(false); }
    })();
  }, [user]);

  // Computed stats from real data
  const total = tickets.length;
  const active = tickets.filter((t) => t.status !== "resolved").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const emergency = tickets.filter((t) => t.severity === "emergency").length;

  const activeTickets = tickets.filter((t) => t.status !== "resolved").slice(0, 4);
  const recentResolved = tickets.filter((t) => t.status === "resolved").slice(0, 2);

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Most common category
  const categoryCount: Record<string, number> = {};
  tickets.forEach((t) => { categoryCount[t.category] = (categoryCount[t.category] || 0) + 1; });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const stats = [
    { label: "Total Filed", value: total, icon: FileText, color: "text-foreground" },
    { label: "Active", value: active, icon: Clock, color: "text-amber-400" },
    { label: "Resolved", value: resolved, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Emergency", value: emergency, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">

        {/* Greeting */}
        <motion.div variants={item}>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading your dashboard…" : total === 0
              ? "You haven't filed any complaints yet."
              : `You have ${active} active complaint${active !== 1 ? "s" : ""} in progress.`}
          </p>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              {loading
                ? <div className="h-8 w-12 bg-secondary rounded-lg animate-pulse" />
                : <span className="text-3xl font-bold text-foreground font-display">{s.value}</span>}
            </div>
          ))}
        </motion.div>

        {/* Insight strip */}
        {!loading && total > 0 && (
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Resolution rate */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Resolution Rate</span>
                <AiBadge />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-display font-bold text-foreground">{resolutionRate}%</span>
                <span className="text-xs text-muted-foreground mb-1">of complaints resolved</span>
              </div>
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${resolutionRate}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-emerald-400"
                />
              </div>
            </div>

            {/* Top issue category */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-foreground">Top Issue Category</span>
              </div>
              {topCategory ? (
                <>
                  <p className="text-base font-bold text-foreground">{topCategory}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {categoryCount[topCategory]} complaint{categoryCount[topCategory] !== 1 ? "s" : ""} filed
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>

            {/* Quick action */}
            <div className="glass-card p-4 border-l-4 border-l-accent cursor-pointer hover:shadow-md transition-all"
              onClick={() => router.push("/report")}>
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Report an Issue</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Spotted a civic problem? Takes under a minute.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Get Started <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        )}

        {/* Active Complaints */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Active Complaints</h2>
            <button onClick={() => router.push("/tickets")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-secondary rounded w-1/3" />
                      <div className="h-4 bg-secondary rounded w-2/3" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && activeTickets.length === 0 && (
            <div className="glass-card p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No active complaints</p>
              <p className="text-xs text-muted-foreground mt-1">Everything's resolved — or file a new one below.</p>
              <Button className="mt-4 rounded-xl gap-2 bg-primary text-primary-foreground" onClick={() => router.push("/report")}>
                <Plus className="w-4 h-4" /> Report an Issue
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {activeTickets.map((ticket, i) => {
              const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];
              const statusDot = STATUS_DOT[ticket.status] ?? "bg-blue-400";
              const statusLabel = STATUS_LABEL[ticket.status] ?? ticket.status;
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="glass-card p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    {ticket.photo_urls?.[0] ? (
                      <img src={ticket.photo_urls[0]} alt={ticket.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          {statusLabel}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${sevClass}`}>
                          {ticket.severity}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{ticket.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{timeAgo(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ticket.priority_score >= 80 ? "bg-red-400" : ticket.priority_score >= 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                        style={{ width: `${ticket.priority_score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">P{ticket.priority_score}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recently Resolved */}
        {!loading && recentResolved.length > 0 && (
          <motion.div variants={item}>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Recently Resolved</h2>
            <div className="space-y-3">
              {recentResolved.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="glass-card p-4 cursor-pointer hover:shadow-md transition-all opacity-80 hover:opacity-100 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.department} · {timeAgo(ticket.updated_at)}</p>
                    </div>
                    {ticket.rating != null && (
                      <div className="flex gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < ticket.rating ? "text-accent fill-accent" : "text-border"}`} />
                        ))}
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state CTA */}
        {!loading && total === 0 && (
          <motion.div variants={item} className="glass-card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nothing filed yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Spot a civic issue in your area? Report it and track resolution in real time.
            </p>
            <Button className="rounded-xl gap-2 bg-primary text-primary-foreground" onClick={() => router.push("/report")}>
              <Plus className="w-4 h-4" /> Report Your First Issue
            </Button>
          </motion.div>
        )}

      </motion.div>

      {/* Ticket detail modal */}
      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </>
  );
}
