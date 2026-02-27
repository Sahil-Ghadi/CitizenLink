"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft, Send, MapPin, CheckCircle, RefreshCw,
  XCircle, Sparkles, AlertTriangle, Clock, ChevronDown, ChevronUp, Zap, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runCopilot, type CopilotResponse } from "@/lib/api/agents";
import { getIdToken } from "@/lib/auth";
import { useTicketById } from "@/hooks/use-tickets";

const AgentTicketDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  // Fetch real ticket data from Firestore
  const { ticket, loading: ticketLoading, error: ticketError } = useTicketById(id);

  const [aiSummaryOpen, setAiSummaryOpen] = useState(true);
  const [draftResponse, setDraftResponse] = useState("");

  // AI Copilot state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotData, setCopilotData] = useState<CopilotResponse | null>(null);

  const handleRunCopilot = useCallback(async () => {
    if (!ticket) return;
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const result = await runCopilot(
        {
          ticket_id: ticket.id,
          description: ticket.description,
          issue_type: ticket.category,
          department: ticket.department,
        },
        token
      );
      setCopilotData(result);
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : "Copilot failed");
    } finally {
      setCopilotLoading(false);
    }
  }, [ticket]);

  // Loading state
  if (ticketLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-secondary rounded w-24" />
        <div className="h-8 bg-secondary rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="glass-card p-4 h-32" />
              <div className="glass-card p-4 h-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error / not found state
  if (ticketError || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{ticketError ?? "Ticket not found"}</p>
        <Button variant="outline" onClick={() => router.push("/agent/queue")} className="mt-4 rounded-xl">Back to Queue</Button>
      </div>
    );
  }

  // Set initial draft when ticket loads (if copilot hasn't run yet)
  if (!draftResponse && !copilotData) {
    setDraftResponse(
      `Dear ${ticket.citizen_name},\n\nThank you for reporting this issue. We have reviewed your complaint and our team is now working on it.\n\nBest regards,\nPublic Works Department`
    );
  }

  const displayedSummary = ticket.ai_summary ?? "No AI summary available.";
  const displayedAction = copilotData?.recommended_action ?? "Click 'Run AI Copilot' to generate recommended actions.";
  const displayedEffort = copilotData?.effort_estimate;
  const displayedRisk = copilotData?.risk_level;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => router.push("/agent/queue")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <SeverityBadge severity={ticket.severity} />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">Score: {ticket.priority_score}</span>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">{ticket.title}</h1>
        </div>
        <Button
          onClick={handleRunCopilot}
          disabled={copilotLoading}
          className="rounded-xl gap-2 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {copilotLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {copilotData ? "Refresh AI" : "Run AI Copilot"}</>
          )}
        </Button>
      </div>

      {/* Copilot error */}
      {copilotError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{copilotError}</span>
        </div>
      )}

      {/* Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Description */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Citizen Report</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
          </div>

          {/* Location */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</h3>
            <p className="text-sm text-muted-foreground">{ticket.location_address}</p>
            <div className="mt-3 w-full h-32 rounded-xl bg-secondary flex items-center justify-center border border-border">
              <MapPin className="w-6 h-6 text-accent" />
            </div>
          </div>

          {/* Citizen Profile */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Citizen Profile</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                {ticket.citizen_name?.split(" ").map((n) => n[0]).join("") ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {ticket.citizen_name}
                  {ticket.citizen_verified && <VerifiedBadge />}
                </p>
                <p className="text-xs text-muted-foreground">{ticket.citizen_email}</p>
              </div>
            </div>
          </div>

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
        </div>

        {/* RIGHT PANEL - AI Assistant */}
        <div className="space-y-4">
          {/* AI Summary */}
          <div className="glass-card p-4 border-l-4 border-l-accent">
            <button onClick={() => setAiSummaryOpen(!aiSummaryOpen)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">AI Summary</span>
                <AiBadge />
              </div>
              {aiSummaryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {aiSummaryOpen && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-muted-foreground mt-2">
                {displayedSummary}
              </motion.p>
            )}
          </div>

          {/* Recommended Action */}
          <div className="glass-card p-4 bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Recommended Action</span>
              <AiBadge />
            </div>
            {copilotLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Generating…</div>
            ) : (
              <p className="text-sm text-muted-foreground">{displayedAction}</p>
            )}
          </div>

          {/* Effort + Risk */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              {copilotLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Calculating…</div>
              ) : copilotData ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Effort: <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground text-xs font-bold">{displayedEffort}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Risk: <span className="font-semibold text-foreground capitalize">{displayedRisk}</span></p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Priority Score: <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground text-xs font-bold">{ticket.priority_score}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Run AI Copilot for effort & risk estimate</p>
                </>
              )}
            </div>
            <AiBadge />
          </div>

          {/* Sentiment flag */}
          {ticket.severity === "emergency" && (
            <div className="glass-card p-4 border-l-4 border-l-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-foreground">Sentiment Flag</span>
                <AiBadge />
              </div>
              <p className="text-sm text-muted-foreground mt-1">⚠️ Citizen tone is urgent. Use empathetic language.</p>
            </div>
          )}

          {/* Similar Cases placeholder */}
          {!copilotData && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Similar Past Cases</span>
                <AiBadge />
              </div>
              <p className="text-xs text-muted-foreground">Run AI Copilot to surface similar resolved cases.</p>
            </div>
          )}

          {/* Draft Response */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Draft Response</span>
              <AiBadge />
              {copilotData && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-semibold">AI Generated</span>
              )}
            </div>
            {copilotLoading ? (
              <div className="h-[120px] rounded-xl bg-secondary flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Drafting reply…
              </div>
            ) : (
              <Textarea value={draftResponse} onChange={(e) => setDraftResponse(e.target.value)} className="rounded-xl min-h-[120px] text-sm mb-3" />
            )}
            {!copilotLoading && (
              <Button className="w-full rounded-xl bg-primary text-primary-foreground gap-2">
                <Send className="w-4 h-4" /> Send to Citizen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Primary */}
          <Button className="rounded-xl bg-status-resolved text-primary-foreground gap-2 hover:bg-status-resolved/90 h-11">
            <CheckCircle className="w-4 h-4" /> Accept & Start
          </Button>
          <Button
            className="rounded-xl bg-accent text-accent-foreground gap-2 hover:bg-accent/90 h-11"
            onClick={() => ticket && router.push(`/agent/resolve/${ticket.id}`)}
          >
            <CheckCircle className="w-4 h-4" /> Resolve Ticket
          </Button>
          {/* Secondary */}
          <Button variant="outline" className="rounded-xl gap-2 h-10 text-sm">
            <RefreshCw className="w-4 h-4" /> Reassign
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 h-10 text-sm text-destructive border-destructive/20 hover:bg-destructive/5">
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentTicketDetail;
