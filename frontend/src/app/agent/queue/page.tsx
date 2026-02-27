"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { tickets } from "@/data/mockData";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import { Filter, ArrowUpDown, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const TicketQueue = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date">("priority");

  let filtered = tickets.filter((t) => t.status !== "resolved");
  if (severityFilter !== "all") filtered = filtered.filter((t) => t.severity === severityFilter);
  if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
  filtered.sort((a, b) => sortBy === "priority" ? b.priorityScore - a.priorityScore : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ticket Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} active tickets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", "emergency", "high", "medium", "low"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${severityFilter === sev ? "bg-card shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground"
                }`}
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

      {/* Queue */}
      <div className="space-y-3">
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
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">⚡ {ticket.priorityScore}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{ticket.title}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">{ticket.citizenName} {ticket.citizenVerified && <VerifiedBadge />}</span>
                  <span>•</span>
                  <span>{ticket.department}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ticket.location.split(",")[0]}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <AiBadge />
                  <p className="text-xs text-muted-foreground truncate">{ticket.aiSummary}</p>
                </div>
              </div>
              <div className="text-right shrink-0 text-xs text-muted-foreground">
                <p>{Math.ceil((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d ago</p>
                <p className="mt-1 font-medium text-foreground">Est. {ticket.estimatedDays}d</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TicketQueue;

