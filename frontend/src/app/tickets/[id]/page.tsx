"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge, SeverityBadge, AiBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft, Send, Star, Clock, AlertTriangle, RefreshCw, ChevronUp, MapPin, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTicketById } from "@/hooks/use-tickets";

const statusSteps = [
  { label: "Submitted", icon: "📋" },
  { label: "Under Review", icon: "🔍" },
  { label: "In Progress", icon: "🔧" },
  { label: "Resolved", icon: "✅" },
];

function statusToIndex(status: string): number {
  if (status === "resolved") return 3;
  if (status === "in-progress") return 2;
  if (status === "submitted") return 0;
  return 0;
}

const TicketDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { ticket, loading, error } = useTicketById(id);
  const [newMessage, setNewMessage] = useState("");
  const [rating, setRating] = useState(0);

  // Loading
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-5 bg-secondary rounded w-24" />
        <div className="glass-card p-5 h-40" />
        <div className="glass-card p-4 h-20" />
      </div>
    );
  }

  // Error / not found
  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error ?? "Ticket not found"}</p>
        <Button variant="outline" onClick={() => router.push("/tickets")} className="mt-4 rounded-xl">
          Back to Tickets
        </Button>
      </div>
    );
  }

  const statusIndex = statusToIndex(ticket.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push("/tickets")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <SeverityBadge severity={ticket.severity} />
            </div>
            <h1 className="text-lg font-display font-bold text-foreground">{ticket.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{ticket.location_address}
            </p>
          </div>
          {ticket.agent_name && (
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <p className="font-medium text-foreground">{ticket.agent_name}</p>
              <p>Assigned agent</p>
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="flex items-center justify-between mt-6">
          {statusSteps.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${i <= statusIndex ? "bg-accent/15 border-2 border-accent" : "bg-secondary border-2 border-border"}`}>
                  {i <= statusIndex ? s.icon : <span className="text-muted-foreground text-sm">{i + 1}</span>}
                </div>
                <span className={`text-[10px] mt-1 ${i <= statusIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${i < statusIndex ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI ETA */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {ticket.status === "resolved"
              ? "Issue resolved ✓"
              : `Priority Score: ${ticket.priority_score}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {ticket.status === "resolved"
              ? `Resolved on ${new Date(ticket.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
              : `Department: ${ticket.department}`}
          </p>
        </div>
        <AiBadge />
      </div>

      {/* Description */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
      </div>

      {/* AI Summary */}
      {ticket.ai_summary && (
        <div className="glass-card p-4 border-l-4 border-l-accent">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
            <AiBadge />
          </div>
          <p className="text-sm text-muted-foreground">{ticket.ai_summary}</p>
        </div>
      )}

      {/* Photos */}
      {ticket.photo_urls && ticket.photo_urls.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Photos</h3>
          <div className="grid grid-cols-2 gap-2">
            {ticket.photo_urls.map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover rounded-xl border border-border" />
            ))}
          </div>
        </div>
      )}

      {/* Resolution details (if resolved) */}
      {ticket.status === "resolved" && (ticket as any).resolution_note && (
        <div className="glass-card p-4 border-l-4 border-l-status-resolved">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-status-resolved" />
            <h3 className="text-sm font-semibold text-foreground">Resolution Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground">{(ticket as any).resolution_note}</p>
          {(ticket as any).resolution_type && (
            <span className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved">
              {(ticket as any).resolution_type}
            </span>
          )}
          {(ticket as any).proof_url && (
            <img src={(ticket as any).proof_url} alt="Resolution proof" className="mt-3 w-full h-32 object-cover rounded-xl border border-border" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {ticket.status === "in-progress" && (
          <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <ChevronUp className="w-4 h-4" /> Escalate
          </Button>
        )}
        {ticket.status === "resolved" && (
          <Button variant="outline" className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Reopen
          </Button>
        )}
      </div>

      {/* Rating (shown only after resolution) */}
      {ticket.status === "resolved" && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Rate Resolution</h3>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star className={`w-7 h-7 transition-colors ${star <= rating ? "text-accent fill-accent" : "text-border hover:text-accent/50"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Leave a comment about the resolution…" className="rounded-xl text-sm" />
          {rating > 0 && (
            <Button className="mt-3 rounded-xl bg-primary text-primary-foreground" size="sm">Submit Rating</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
