"use client";
import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, FileText,
  Plus, ChevronRight, Flame, BarChart3,
  Star, Sparkles, Zap, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

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
  emergency: { dot: "bg-red-400", label: "Emergency", pill: "bg-red-400/10 text-red-400" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Circular progress ring for resolution rate
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

export default function CitizenDashboard() {
  const router = useRouter();
  const { user } = useAppContext();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.displayName?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const isResolved = (t: any) => t.status === "resolved" || t.status === "auto-resolved";

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tickets"), where("citizen_uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTickets(docs);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const total = tickets.length;
  const active = tickets.filter((t) => !isResolved(t)).length;
  const resolved = tickets.filter(isResolved).length;
  const emergency = tickets.filter((t) => t.severity === "emergency").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const activeTickets = tickets.filter((t) => !isResolved(t)).slice(0, 4);
  const recentResolved = tickets.filter(isResolved).slice(0, 3);

  const categoryCount: Record<string, number> = {};
  tickets.forEach((t) => { categoryCount[t.category] = (categoryCount[t.category] || 0) + 1; });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const statCards = [
    { label: "Total Filed", value: total, icon: FileText, accent: "text-foreground", ring: "ring-border", bg: "bg-secondary/40" },
    { label: "Active", value: active, icon: Clock, accent: "text-amber-400", ring: "ring-amber-500/20", bg: "bg-amber-500/5" },
    { label: "Resolved", value: resolved, icon: CheckCircle2, accent: "text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-500/5" },
    { label: "Emergency", value: emergency, icon: AlertTriangle, accent: "text-red-400", ring: "ring-red-500/20", bg: "bg-red-500/5" },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-7">

        {/* ── Hero greeting ─────────────────────────────────────────────── */}
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent border border-accent/20">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">{greeting}</p>
              <h1 className="text-2xl font-display font-bold text-foreground">{displayName} 👋</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {loading
                  ? "Loading your dashboard…"
                  : total === 0
                    ? "You haven't filed any complaints yet."
                    : active > 0
                      ? `${active} active complaint${active !== 1 ? "s" : ""} · ${resolved} resolved`
                      : "All your complaints are resolved! 🎉"}
              </p>
            </div>
            <Button
              onClick={() => router.push("/report")}
              className="rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 shrink-0"
            >
              <Plus className="w-4 h-4" /> Report Issue
            </Button>
          </div>
        </motion.div>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
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

        {/* ── Insights row ──────────────────────────────────────────────── */}
        {!loading && total > 0 && (
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Resolution rate ring */}
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="relative">
                <ResolutionRing pct={resolutionRate} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground rotate-90">
                  {resolutionRate}%
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-semibold text-foreground">Resolution Rate</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {resolved} of {total} complaint{total !== 1 ? "s" : ""} resolved
                </p>
                {resolutionRate === 100 && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> Perfect score
                  </span>
                )}
              </div>
            </div>

            {/* Top category */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">Most Reported</p>
              </div>
              {topCategory ? (
                <>
                  <p className="text-base font-bold text-foreground">{topCategory}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {categoryCount[topCategory]} complaint{categoryCount[topCategory] !== 1 ? "s" : ""} filed
                  </p>
                  <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (categoryCount[topCategory] / total) * 100)}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full bg-orange-400"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>

            {/* AI triage badge */}
            <div className="glass-card p-5 border border-accent/20 bg-accent/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                </div>
                <p className="text-xs font-semibold text-foreground">AI Auto-Triage</p>
              </div>
              <p className="text-base font-bold text-foreground">
                {tickets.filter((t) => t.triage_routed_to === "llm").length} resolved
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">auto-answered by CitizenLink AI</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by Gemini
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Active Complaints ─────────────────────────────────────────── */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Active Complaints</h2>
              {!loading && active > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{active} pending resolution</p>
              )}
            </div>
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
              <p className="text-xs text-muted-foreground mt-1">No active complaints right now.</p>
              <Button className="mt-4 rounded-xl gap-2 bg-primary text-primary-foreground" onClick={() => router.push("/report")}>
                <Plus className="w-4 h-4" /> Report a New Issue
              </Button>
            </motion.div>
          )}

          <div className="space-y-3">
            {activeTickets.map((ticket, i) => {
              const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG["submitted"];
              const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className="glass-card p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    {ticket.photo_urls?.[0] ? (
                      <img src={ticket.photo_urls[0]} alt={ticket.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

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

        {/* ── Recently Resolved ─────────────────────────────────────────── */}
        {!loading && recentResolved.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">Recently Resolved</h2>
              <button onClick={() => router.push("/tickets")}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentResolved.map((ticket, i) => {
                const isAI = ticket.triage_routed_to === "llm" || ticket.status === "auto-resolved";
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-emerald-500 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isAI ? "bg-accent/10" : "bg-emerald-500/10"}`}>
                        {isAI
                          ? <Sparkles className="w-4 h-4 text-accent" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                          {ticket.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          {isAI && <span className="text-accent font-semibold">AI resolved</span>}
                          {isAI && <span className="w-1 h-1 rounded-full bg-border" />}
                          <span>{ticket.department}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{timeAgo(ticket.updated_at)}</span>
                        </p>
                      </div>
                      {ticket.rating != null && (
                        <div className="flex gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3 h-3 ${j < ticket.rating ? "text-accent fill-accent" : "text-border"}`} />
                          ))}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 shrink-0 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!loading && total === 0 && (
          <motion.div variants={item}
            className="glass-card p-12 text-center border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nothing filed yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs mx-auto">
              Spot a civic issue in your area? Report it and track resolution in real time.
            </p>
            <Button className="rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              onClick={() => router.push("/report")}>
              <Plus className="w-4 h-4" /> Report Your First Issue
            </Button>
          </motion.div>
        )}

      </motion.div>
    </>
  );
}
