"use client";
// Strip markdown from LLM-generated text so it reads cleanly in the UI
function cleanMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")         // # headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // **bold**
    .replace(/\*(.+?)\*/g, "$1")         // *italic*
    .replace(/`(.+?)`/g, "$1")           // `code`
    .replace(/^[-*]\s+/gm, "• ")          // bullet list items
    .replace(/^\d+\.\s+/gm, "")          // numbered list
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [link](url)
    .replace(/\n{3,}/g, "\n\n")           // collapse excess newlines
    .trim();
}

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, User2, Building2, Star,
  CheckCircle2, Loader2, Hash, MessageSquare, ExternalLink,
  AlertTriangle, Plus, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getIdToken } from "@/lib/auth";
import { useAppContext } from "@/context/AppContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const TIMELINE_DEFAULT = [
  { label: "Submitted", icon: Hash },
  { label: "Under Review", icon: Loader2 },
  { label: "Agent Assigned", icon: User2 },
  { label: "Resolved", icon: CheckCircle2 },
];
const TIMELINE_AI = [
  { label: "Submitted", icon: Hash },
  { label: "Under Review", icon: Loader2 },
  { label: "Solved by AI", icon: Sparkles },
  { label: "Resolved", icon: CheckCircle2 },
];
const STATUS_ORDER: Record<string, number> = {
  submitted: 0, "in-progress": 1, resolved: 3, "auto-resolved": 3,
};
const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  submitted: { label: "Submitted", color: "text-blue-400", dot: "bg-blue-400" },
  "in-progress": { label: "In Progress", color: "text-amber-400", dot: "bg-amber-400" },
  resolved: { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
  "auto-resolved": { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
};
const SEV_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CitizenTicketDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAppContext();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayIdx, setDisplayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${BACKEND_URL}/tickets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Ticket not found");
        setTicket(await res.json());
      } catch (e: any) {
        setError(e.message ?? "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  // Derive isAutoResolved safely (ticket may still be null during loading)
  const isAutoResolved =
    ticket?.triage_routed_to === "llm" || ticket?.status === "auto-resolved";

  // Animate steps 0→1→2→3 with 700ms delay between each when auto-resolved
  // MUST be before any early returns to avoid Rules-of-Hooks violations
  useEffect(() => {
    if (!isAutoResolved || !ticket) return;
    setDisplayIdx(0);
    const timers = [1, 2, 3].map((step) =>
      setTimeout(() => setDisplayIdx(step), step * 700)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, isAutoResolved]);

  if (loading)
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-pulse pt-2">
        <div className="h-4 bg-secondary rounded w-24" />
        <div className="glass-card p-5 h-28" />
        <div className="glass-card p-5 h-44" />
        <div className="glass-card p-5 h-24" />
      </div>
    );

  if (error || !ticket)
    return (
      <div className="text-center py-24">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">{error || "Ticket not found"}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.push("/tickets")}>
          Back to My Tickets
        </Button>
      </div>
    );

  const TIMELINE = isAutoResolved ? TIMELINE_AI : TIMELINE_DEFAULT;
  const finalIdx = isAutoResolved
    ? 3
    : ticket.status === "in-progress" && ticket.agent_name
      ? 2
      : (STATUS_ORDER[ticket.status] ?? 0);
  // statusIdx drives the visual display — animated for auto-resolved, instant otherwise
  const statusIdx = isAutoResolved ? (displayIdx ?? 0) : finalIdx;

  const statusMeta = STATUS_META[ticket.status] ?? STATUS_META["submitted"];
  const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];
  const messages: any[] = ticket.messages || [];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-4">

      {/* Back link */}
      <button onClick={() => router.push("/tickets")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> My Tickets
      </button>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="glass-card p-5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">{ticket.id}</span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${statusMeta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${sevClass}`}>
            {ticket.severity}
          </span>
        </div>
        <h1 className="text-lg font-display font-bold text-foreground leading-snug">{ticket.title}</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {ticket.department} · {ticket.category}
        </p>
      </div>

      {/* ── Photos ──────────────────────────────────────────────────────────── */}
      {ticket.photo_urls && ticket.photo_urls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ticket.photo_urls.map((url: string, i: number) => (
            <img key={i} src={url} alt={`Photo ${i + 1}`}
              className="h-40 w-auto rounded-2xl object-cover border border-border flex-shrink-0" />
          ))}
        </div>
      )}

      {/* ── Progress + Agent (combined card) ─────────────────────────────── */}
      <div className="glass-card p-5 space-y-5">
        {/* Timeline */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Progress</p>
          <div className="relative">
            <div className="absolute left-3.5 top-3 bottom-3 w-px bg-border" />
            <div className="space-y-4">
              {TIMELINE.map((step, i) => {
                const done = i <= statusIdx;
                const active = i === statusIdx;
                const Icon = step.icon;
                const isResolved = i === 3;
                const isAIStep = isAutoResolved && i === 2;
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 relative"
                    initial={false}
                  >
                    <motion.div
                      animate={{
                        scale: done ? (active ? 1.1 : 1) : 1,
                        backgroundColor: done
                          ? active
                            ? isResolved ? "#10b981" : isAIStep ? "hsl(var(--accent))" : "hsl(var(--accent))"
                            : "hsl(var(--status-resolved))"
                          : "hsl(var(--secondary))",
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${active && done
                        ? isResolved
                          ? "ring-2 ring-emerald-500/30"
                          : isAIStep
                            ? "ring-2 ring-accent/30"
                            : "ring-2 ring-accent/30"
                        : ""
                        }`}
                    >
                      <motion.div
                        animate={{ scale: done ? 1 : 0.7, opacity: done ? 1 : 0.4 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon className={`w-3.5 h-3.5 ${done ? "text-white" : "text-muted-foreground"} ${active && i === 1 && !isAutoResolved ? "animate-spin" : ""
                          }`} />
                      </motion.div>
                    </motion.div>

                    <div className="flex-1 flex items-center justify-between">
                      <motion.p
                        animate={{
                          color: done
                            ? active && isResolved ? "rgb(52 211 153)" : "hsl(var(--foreground))"
                            : "hsl(var(--muted-foreground))",
                        }}
                        transition={{ duration: 0.4 }}
                        className="text-sm font-medium"
                      >
                        {step.label}
                        {i === 2 && ticket.agent_name && !isAutoResolved && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">({ticket.agent_name})</span>
                        )}
                      </motion.p>
                      {i === 0 && <span className="text-[10px] text-muted-foreground">{fmt(ticket.created_at)}</span>}
                      {i === 3 && (ticket.status === "resolved" || ticket.status === "auto-resolved") && (
                        <span className="text-[10px] text-muted-foreground">{fmt(ticket.updated_at)}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority bar */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Priority</span>
            <span className="font-bold text-foreground">{ticket.priority_score}/100</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${ticket.priority_score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${ticket.priority_score >= 80 ? "bg-red-400" : ticket.priority_score >= 60 ? "bg-amber-400" : "bg-emerald-400"
                }`}
            />
          </div>
        </div>
      </div>

      {/* ── Agent Updates ───────────────────────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Updates
          </p>
          {messages.map((msg: any) => (
            <div key={msg.id} className="bg-secondary/50 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">{
                  msg.from === "llm" ? "CitizenLink AI Assistant" : msg.sender_name
                }</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.sent_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{cleanMarkdown(msg.text || "")}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Details (description + meta grid) ──────────────────────────────── */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Issue Details</p>

        {ticket.description && (
          <p className="text-sm text-foreground leading-relaxed">{ticket.description}</p>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-border pt-4">
          {[
            { label: "Category", value: ticket.category },
            { label: "Type", value: ticket.ongoing ? "Ongoing" : "One-time" },
            { label: "Filed", value: fmt(ticket.created_at) },
            ticket.start_date ? { label: "Since", value: new Date(ticket.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) } : null,
          ].filter(Boolean).map(({ label, value }: any) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
              <p className="font-medium text-foreground capitalize">{value || "—"}</p>
            </div>
          ))}
        </div>

        {ticket.additional_info && (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Additional Notes</p>
            <p className="text-sm text-foreground">{ticket.additional_info}</p>
          </div>
        )}
      </div>

      {/* ── Location ───────────────────────────────────────────────────────── */}
      {(ticket.location_address || ticket.latitude) && (
        <div className="glass-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</p>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              {ticket.location_address || `${ticket.latitude?.toFixed(5)}, ${ticket.longitude?.toFixed(5)}`}
            </p>
          </div>
          {ticket.latitude && ticket.longitude && (
            <a href={`https://maps.google.com/?q=${ticket.latitude},${ticket.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              Open in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* ── Rating (resolved only) ─────────────────────────────────────────── */}
      {(ticket.status === "resolved" || ticket.status === "auto-resolved") && (
        <div className="glass-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Rating</p>
          {ticket.rating != null ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < ticket.rating ? "text-accent fill-accent" : "text-border"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{ticket.rating}/5</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet rated</p>
          )}
        </div>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <Button variant="outline" className="w-full rounded-xl gap-2 mb-4" onClick={() => router.push("/report")}>
        <Plus className="w-4 h-4" /> Report Another Issue
      </Button>
    </motion.div>
  );
}
