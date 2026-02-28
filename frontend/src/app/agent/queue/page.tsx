"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import {
  Filter, ArrowUpDown, MapPin, Search, RefreshCw,
  Loader2, AlertTriangle, AlertOctagon, Siren, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAgentTickets, type ApiTicket } from "@/hooks/use-tickets";

// ── SLA helpers ───────────────────────────────────────────────────────────────
const SLA_WINDOWS: Record<string, { submitted: number; in_progress: number }> = {
  emergency: { submitted: 1, in_progress: 4 },
  high: { submitted: 4, in_progress: 12 },
  medium: { submitted: 12, in_progress: 24 },
  low: { submitted: 24, in_progress: 48 },
};

function hoursElapsed(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function slaOverdueHours(ticket: ApiTicket): number {
  const windows = SLA_WINDOWS[ticket.severity] ?? { submitted: 24, in_progress: 48 };
  const status = ticket.status;
  if (status === "submitted") {
    const hours = hoursElapsed(ticket.created_at);
    return hours > windows.submitted ? hours - windows.submitted : 0;
  }
  if (status === "in-progress") {
    const ref = (ticket as any).status_changed_at || ticket.created_at;
    const hours = hoursElapsed(ref);
    return hours > windows.in_progress ? hours - windows.in_progress : 0;
  }
  return 0;
}

function formatOverdue(h: number) {
  if (h >= 24) return `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h overdue`;
  const m = Math.floor((h % 1) * 60);
  return `${Math.floor(h)}h ${m}m overdue`;
}

// ── Escalation level badge ────────────────────────────────────────────────────
function EscalatedPill({ level }: { level: number }) {
  if (level === 3) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
      <AlertOctagon className="w-2.5 h-2.5" /> CRITICAL
    </span>
  );
  if (level === 2) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
      <Siren className="w-2.5 h-2.5" /> REOPENED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
      <AlertTriangle className="w-2.5 h-2.5" /> SLA BREACH
    </span>
  );
}

const TicketQueue = () => {
  const router = useRouter();
  const { tickets, loading, error, refresh } = useAgentTickets();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "date">("priority");

  let filtered: ApiTicket[] = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "auto-resolved" && t.status !== "rejected"
      && ((t as any).status === "reopened" || (t as any).triage_routed_to !== "llm")
  );

  if (severityFilter !== "all") filtered = filtered.filter((t) => t.severity === severityFilter);
  if (escalatedOnly) filtered = filtered.filter((t) => (t as any).escalated);
  if (search)
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
    );

  // Escalated tickets always float to top, then by chosen sort
  filtered.sort((a, b) => {
    const aE = (a as any).escalated ? 1 : 0;
    const bE = (b as any).escalated ? 1 : 0;
    if (bE !== aE) return bE - aE;
    return sortBy === "priority"
      ? b.priority_score - a.priority_score
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const escalatedCount = tickets.filter((t) => (t as any).escalated).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Ticket Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${filtered.length} active ticket${filtered.length !== 1 ? "s" : ""}`}
            {escalatedCount > 0 && !loading && (
              <span className="ml-2 text-amber-400 font-semibold">· {escalatedCount} escalated</span>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets…" className="pl-10 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", "emergency", "high", "medium", "low"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${severityFilter === sev ? "bg-card shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground"}`}
            >
              {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
          {/* Escalated filter */}
          <button
            onClick={() => setEscalatedOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${escalatedOnly
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "text-muted-foreground hover:text-foreground border-border"
              }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Escalated {escalatedCount > 0 && `(${escalatedCount})`}
          </button>
        </div>
        <button
          onClick={() => setSortBy(sortBy === "priority" ? "date" : "priority")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-all"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortBy === "priority" ? "Priority" : "Date"}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-3 bg-secondary rounded w-24 mb-2" />
              <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Queue */}
      {!loading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {error ? "Could not load tickets." : "No tickets match your filters."}
            </div>
          )}
          {filtered.map((ticket, i) => {
            const t = ticket as any;
            const isEscalated = !!t.escalated;
            const overdueH = slaOverdueHours(ticket);

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/agent/ticket/${ticket.id}`)}
                className={`glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${isEscalated ? "ring-1 ring-amber-500/25" : ""
                  }`}
              >
                {/* Escalation stripe */}
                {isEscalated && (
                  <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-amber-500/15">
                    <EscalatedPill level={t.escalation_level ?? 1} />
                    {t.escalation_reason && (
                      <span className="text-[10px] text-amber-400/75 truncate flex-1">{t.escalation_reason}</span>
                    )}
                    {t.escalated_at && (
                      <span className="text-[10px] text-amber-400/60 shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatOverdue(hoursElapsed(t.escalated_at))} ago
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                      <SeverityBadge severity={ticket.severity} />
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">⚡ {ticket.priority_score}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{ticket.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {ticket.citizen_name}
                        {ticket.citizen_verified && <VerifiedBadge />}
                      </span>
                      <span>•</span>
                      <span>{ticket.department}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ticket.location_address?.split(",")[0] ?? "—"}
                      </span>
                    </div>
                    {ticket.ai_summary && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <AiBadge />
                        <p className="text-xs text-muted-foreground truncate">{ticket.ai_summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground space-y-1">
                    <p>{Math.ceil((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))}d ago</p>
                    {/* SLA countdown for non-escalated overdue */}
                    {overdueH > 0 && !isEscalated && (
                      <p className="text-amber-400 font-medium flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatOverdue(overdueH)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketQueue;
