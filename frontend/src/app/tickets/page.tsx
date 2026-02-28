"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Clock, Star, MapPin, RefreshCw, Plus, FileText,
  Filter, ChevronRight, Loader2, AlertTriangle
} from "lucide-react";
import { StatusBadge, SeverityBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const STATUS_FILTERS = ["all", "submitted", "in-progress", "resolved"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  submitted: { label: "Submitted", color: "text-blue-400", dot: "bg-blue-400" },
  "in-progress": { label: "In Progress", color: "text-amber-400", dot: "bg-amber-400" },
  resolved: { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
  "auto-resolved": { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
  emergency: { label: "Emergency", color: "text-red-400", dot: "bg-red-400" },
  rejected: { label: "Rejected", color: "text-red-400", dot: "bg-red-400" },
  reopened: { label: "Reopened", color: "text-orange-400", dot: "bg-orange-400" },
};

const SEV_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-500/10 border-red-500/25",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  low: "text-green-400 bg-green-500/10 border-green-500/25",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { user } = useAppContext();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");

    const q = query(
      collection(db, "tickets"),
      where("citizen_uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Because Firestore doesn't allow ordering on a different field than the inequality filter natively without an index,
        // we fetch them all for this user and sort client-side by created_at.
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
        })) as any[];

        docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTickets(docs);
        setLoading(false);
      },
      (err) => {
        setError("Could not load tickets. " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const isResolved = (t: any) => t.status === "resolved" || t.status === "auto-resolved";

  const stats = {
    total: tickets.length,
    active: tickets.filter((t) => !isResolved(t)).length,
    resolved: tickets.filter(isResolved).length,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${stats.total} complaint${stats.total !== 1 ? "s" : ""} filed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="rounded-xl gap-1.5 h-9 bg-primary text-primary-foreground"
            onClick={() => router.push("/report")}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && tickets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total Filed", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-amber-400" },
            { label: "Resolved", value: stats.resolved, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filter tabs */}
      {!loading && tickets.length > 0 && (
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1 shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${filter === f
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {f === "all" ? "All" : STATUS_META[f]?.label ?? f}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading your tickets…</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass-card p-6 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-foreground font-medium">{error}</p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No complaints yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Spotted a civic issue? Report it — it takes under a minute.
            </p>
          </div>
          <Button className="rounded-xl bg-primary text-primary-foreground gap-2" onClick={() => router.push("/report")}>
            <Plus className="w-4 h-4" /> Report an Issue
          </Button>
        </motion.div>
      )}

      {!loading && !error && filtered.length === 0 && tickets.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No <span className="capitalize">{filter}</span> tickets.</p>
        </motion.div>
      )}

      {/* Ticket cards */}
      {!loading && !error && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((ticket, i) => {
              const statusMeta = STATUS_META[ticket.status] ?? STATUS_META["submitted"];
              const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className={`glass-card p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group ${(ticket.status === "resolved" || ticket.status === "auto-resolved")
                    ? "border-l-4 border-l-emerald-500 bg-emerald-500/5"
                    : ticket.status === "rejected"
                      ? "border-l-4 border-l-destructive bg-destructive/5"
                      : ticket.status === "reopened"
                        ? "border-l-4 border-l-orange-500 bg-orange-500/5"
                        : ""
                    }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Photo thumbnail */}
                    {ticket.photo_urls?.[0] ? (
                      <img
                        src={ticket.photo_urls[0]}
                        alt={ticket.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{ticket.id}</span>
                        {/* Status dot + label */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${statusMeta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                        {/* Severity pill */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${sevClass}`}>
                          {ticket.severity}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{ticket.department}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {timeAgo(ticket.created_at)}
                        </span>
                      </div>

                      {/* Priority bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${ticket.priority_score >= 80 ? "bg-red-400" :
                              ticket.priority_score >= 60 ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                            style={{ width: `${ticket.priority_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          Priority {ticket.priority_score}
                        </span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      {ticket.rating != null && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3 h-3 ${j < ticket.rating ? "text-accent fill-accent" : "text-border"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description snippet */}
                  {ticket.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 pl-[4.5rem]">
                      {ticket.description}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
