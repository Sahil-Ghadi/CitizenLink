"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import { Filter, ArrowUpDown, MapPin, Search, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAgentTickets, type ApiTicket } from "@/hooks/use-tickets";

const TicketQueue = () => {
  const router = useRouter();
  const { tickets, loading, error, refresh } = useAgentTickets();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date">("priority");

  let filtered: ApiTicket[] = tickets.filter((t) => t.status !== "resolved");
  if (severityFilter !== "all") filtered = filtered.filter((t) => t.severity === severityFilter);
  if (search)
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
    );
  filtered.sort((a, b) =>
    sortBy === "priority"
      ? b.priority_score - a.priority_score
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Ticket Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${filtered.length} active ticket${filtered.length !== 1 ? "s" : ""}`}
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
        <div className="flex items-center gap-2">
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
          {filtered.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(`/agent/ticket/${ticket.id}`)}
              className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
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
                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>{Math.ceil((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))}d ago</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketQueue;
