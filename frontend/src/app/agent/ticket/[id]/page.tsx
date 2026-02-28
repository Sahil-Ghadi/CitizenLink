"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft, Send, MapPin, CheckCircle, RefreshCw,
  XCircle, Sparkles, AlertTriangle, Clock, Zap, FileText,
  Loader2, ExternalLink, Building2, ChevronRight,
  Save, CheckCircle2, MessageSquareX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runCopilot, type CopilotResponse } from "@/lib/api/agents";
import { getIdToken } from "@/lib/auth";
import { useTicketById } from "@/hooks/use-tickets";
import dynamic from "next/dynamic";
import EscalationBanner from "@/components/shared/EscalationBanner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const LeafletMap = dynamic(() => import("@/components/shared/LeafletMap"), {
  ssr: false,
  loading: () => <div className="w-full h-44 rounded-xl bg-secondary animate-pulse" />,
});

const SEV_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
};

const AgentTicketDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const { ticket, loading: ticketLoading, error: ticketError } = useTicketById(id);

  const [draftResponse, setDraftResponse] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotData, setCopilotData] = useState<CopilotResponse | null>(null);
  const [savingCopilot, setSavingCopilot] = useState(false);
  const [copilotSaved, setCopilotSaved] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "ai" | "respond">("details");
  const [escalationAcknowledged, setEscalationAcknowledged] = useState(false);
  // Local status override so the UI reflects the change immediately
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Populate from Firestore-persisted copilot data on load
  useEffect(() => {
    if (!ticket) return;
    if (ticket.copilot_recommended_action) {
      setCopilotData({
        recommended_action: ticket.copilot_recommended_action,
        effort_estimate: ticket.copilot_effort_estimate || "",
        risk_level: ticket.copilot_risk_level || "",
      });
    }
    if (!draftResponse) {
      setDraftResponse(
        ticket.copilot_draft_reply ||
        `Dear ${ticket.citizen_name},\n\nWe have received your complaint (#${ticket.id}) regarding ${ticket.category.toLowerCase()} at ${ticket.location_address}.\n\nWe are currently implementing the necessary fix: our ${ticket.department} team has been assigned and is actively working to resolve the ${ticket.category.toLowerCase()} issue. You can expect an update within 24–48 hours.\n\nThank you for bringing this to our attention.\n\nBest regards,\n${ticket.department} Department`
      );
    }
  }, [ticket?.id]);

  const persistCopilot = async (data: CopilotResponse, draft: string) => {
    setSavingCopilot(true);
    try {
      const token = await getIdToken();
      await fetch(`${BACKEND_URL}/tickets/${id}/copilot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, draft_reply: draft }),
      });
      setCopilotSaved(true);
      setTimeout(() => setCopilotSaved(false), 3000);
    } catch { /* non-critical — ignore */ }
    finally { setSavingCopilot(false); }
  };

  const handleSendMessage = async () => {
    if (!draftResponse.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const token = await getIdToken();
      await fetch(`${BACKEND_URL}/tickets/${id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: draftResponse.trim() }),
      });
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 5000);
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRunCopilot = useCallback(async () => {
    if (!ticket) return;
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const result = await runCopilot(
        { ticket_id: ticket.id, description: ticket.description, issue_type: ticket.category, department: ticket.department },
        token
      );
      setCopilotData(result);
      // Build a citizen-friendly update — never expose the raw internal action plan
      const effort = result.effort_estimate ? ` (estimated resolution: ${result.effort_estimate})` : "";
      const citizenDraft =
        `Dear ${ticket.citizen_name},\n\n` +
        `We are writing to update you on your complaint (#${ticket.id}) regarding ${ticket.category.toLowerCase()} at ${ticket.location_address}.\n\n` +
        `Our ${ticket.department} team is currently working on resolving your issue${effort}. ` +
        `We are implementing the necessary measures and will ensure the matter is addressed promptly.\n\n` +
        `You will receive a further update once the implementation is complete. ` +
        `We sincerely appreciate your patience.\n\n` +
        `Best regards,\n${ticket.department} Department`;
      setDraftResponse(citizenDraft);
      await persistCopilot(result, citizenDraft);
      setActiveTab("ai");
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : "Copilot failed");
    } finally {
      setCopilotLoading(false);
    }
  }, [ticket]);

  const handleAccept = async () => {
    if (!ticket || accepting) return;
    setAccepting(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_URL}/tickets/${id}/accept`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to accept ticket");
      setLocalStatus("in-progress");
      setAccepted(true);
      setTimeout(() => setAccepted(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!ticket || rejecting || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_URL}/tickets/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejection_reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to reject ticket");
      setLocalStatus("rejected");
      setShowRejectModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setRejecting(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────
  if (ticketLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-5 bg-secondary rounded w-28" />
        <div className="h-8 bg-secondary rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card p-4 h-40" />)}
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{ticketError ?? "Ticket not found"}</p>
        <Button variant="outline" onClick={() => router.push("/agent/queue")} className="mt-4 rounded-xl">
          Back to Queue
        </Button>
      </div>
    );
  }

  const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];
  const currentStatus = localStatus ?? ticket.status;
  const hasCopilot = !!copilotData;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Back */}
      <button onClick={() => router.push("/agent/queue")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Queue
      </button>

      {/* Header card */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
              <StatusBadge status={currentStatus as any} />
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${sevClass}`}>
                {ticket.severity}
              </span>
              {ticket.priority_score && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
                  Priority {ticket.priority_score}
                </span>
              )}
              {ticket.copilot_run_at && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI analysed
                </span>
              )}
            </div>
            <h1 className="text-xl font-display font-bold text-foreground leading-snug">{ticket.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {ticket.department} · {ticket.category}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {copilotSaved && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </motion.span>
            )}
            <Button onClick={handleRunCopilot} disabled={copilotLoading}
              className="rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              {copilotLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
                : <><Sparkles className="w-4 h-4" /> {hasCopilot ? "Refresh AI" : "Run AI Copilot"}</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Copilot error */}
      <AnimatePresence>
        {copilotError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {copilotError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Escalation Banner ─────────────────────────────── */}
      {ticket && (ticket as any).escalated && (
        <EscalationBanner
          ticketId={ticket.id}
          level={(ticket as any).escalation_level ?? 1}
          reason={(ticket as any).escalation_reason}
          escalatedAt={(ticket as any).escalated_at}
          acknowledged={(ticket as any).escalation_acknowledged || escalationAcknowledged}
          onAcknowledge={() => setEscalationAcknowledged(true)}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl">
        {(["details", "ai", "respond"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
            {tab === "ai" ? "🤖 AI Copilot" : tab === "respond" ? "✉️ Respond" : "📋 Details"}
            {tab === "details" && ticket && (ticket as any).escalated && !escalationAcknowledged && !(ticket as any).escalation_acknowledged && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
            )}
            {tab === "ai" && hasCopilot && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: DETAILS ── */}
      {activeTab === "details" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {/* Description */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Citizen Report
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description || "No description provided."}</p>
              {ticket.additional_info && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Additional Notes</p>
                  <p className="text-sm text-muted-foreground">{ticket.additional_info}</p>
                </div>
              )}
            </div>

            {/* Key info grid */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Category", value: ticket.category },
                  { label: "Type", value: ticket.ongoing ? "Ongoing" : "One-time" },
                  { label: "Severity", value: ticket.severity },
                  { label: "Filed", value: new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold text-foreground capitalize">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            {ticket.photo_urls && ticket.photo_urls.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Photos ({ticket.photo_urls.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ticket.photo_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`}
                      className="w-full h-36 object-cover rounded-xl border border-border" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Citizen profile */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Citizen</h3>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                  {ticket.citizen_name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {ticket.citizen_name}
                    {ticket.citizen_verified && <VerifiedBadge />}
                  </p>
                  <p className="text-xs text-muted-foreground">{ticket.citizen_email}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Location
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {ticket.location_address || (ticket.latitude && ticket.longitude
                  ? `${ticket.latitude.toFixed(5)}, ${ticket.longitude.toFixed(5)}`
                  : "No location data")}
              </p>
              {ticket.latitude && ticket.longitude ? (
                <>
                  <LeafletMap lat={ticket.latitude} lng={ticket.longitude} onLocationChange={() => { }} readonly />
                  <a href={`https://maps.google.com/?q=${ticket.latitude},${ticket.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    Open in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <div className="h-28 rounded-xl bg-secondary flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No coordinates</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {accepted && (
                  <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Ticket accepted — status changed to In Progress
                  </div>
                )}
                <Button
                  className="rounded-xl bg-status-resolved text-primary-foreground gap-2 h-10 text-sm"
                  onClick={handleAccept}
                  disabled={accepting || currentStatus === "in-progress" || currentStatus === "resolved"}
                >
                  {accepting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting…</>
                    : currentStatus === "in-progress"
                      ? <><CheckCircle className="w-4 h-4" /> In Progress</>
                      : <><CheckCircle className="w-4 h-4" /> Accept &amp; Start</>
                  }
                </Button>
                <Button className="rounded-xl bg-accent text-accent-foreground gap-2 h-10 text-sm hover:bg-accent/90"
                  onClick={() => ticket && router.push(`/agent/resolve/${ticket.id}`)}>
                  <CheckCircle className="w-4 h-4" /> Resolve
                </Button>
                <Button variant="outline" className="rounded-xl gap-2 h-9 text-sm">
                  <RefreshCw className="w-4 h-4" /> Reassign
                </Button>
                <Button variant="outline" className="rounded-xl gap-2 h-9 text-sm text-destructive border-destructive/20 hover:bg-destructive/5"
                  onClick={() => setShowRejectModal(true)}
                  disabled={currentStatus === "resolved" || currentStatus === "rejected" || currentStatus === "auto-resolved"}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reject Modal Overlay */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                <MessageSquareX className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground mb-1">Reject Ticket</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Please provide a clear reason for rejecting this ticket. This reason will be visible to the citizen.
              </p>

              <Textarea
                placeholder="e.g., This issue has already been reported and is being tracked under another ticket..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[120px] rounded-xl mb-4 text-sm resize-none"
              />

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" className="rounded-xl w-full" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground w-full gap-2"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejecting}
                >
                  {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Rejection
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab: AI COPILOT ── */}
      {activeTab === "ai" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* AI summary (from ticket creation) */}
          {ticket.ai_summary && (
            <div className="glass-card p-4 border-l-4 border-l-accent">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">AI Summary</span>
                <AiBadge />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{ticket.ai_summary}</p>
            </div>
          )}

          {!hasCopilot && !copilotLoading && (
            <div className="glass-card p-8 text-center">
              <Sparkles className="w-10 h-10 text-accent/50 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No AI Copilot analysis yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Click "Run AI Copilot" to generate recommended actions, effort estimate, and a risk assessment.
              </p>
              <Button onClick={handleRunCopilot} className="rounded-xl gap-2 bg-accent text-accent-foreground">
                <Sparkles className="w-4 h-4" /> Run AI Copilot
              </Button>
            </div>
          )}

          {copilotLoading && (
            <div className="glass-card p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">AI is analysing this ticket…</p>
            </div>
          )}

          {hasCopilot && !copilotLoading && (() => {
            // Parse recommended_action text into discrete steps
            const raw: string = copilotData.recommended_action ?? "";
            // Split on newlines OR inline numbered markers like ". 2. " / " 2. " / "2. "
            const steps: string[] = raw
              .split(/\n+|\s+(?=\d+[\.\)]\s)/)
              .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^\s*[-•]\s*/, "").trim())
              .filter(Boolean);


            const STEP_ICONS = [
              // search / assess
              <svg key="s" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
              // tool / action
              <svg key="t" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
              // notify / comms
              <svg key="n" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
              // verify / shield
              <svg key="v" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
            ];

            const riskColor =
              copilotData.risk_level === "high" ? { bg: "bg-red-500/15", text: "text-red-400", bar: "bg-red-400", pct: 85 } :
                copilotData.risk_level === "medium" ? { bg: "bg-amber-500/15", text: "text-amber-400", bar: "bg-amber-400", pct: 50 } :
                  { bg: "bg-green-500/15", text: "text-green-400", bar: "bg-green-400", pct: 20 };

            const effortPct =
              /high|complex|major/i.test(copilotData.effort_estimate) ? 80 :
                /medium|moderate/i.test(copilotData.effort_estimate) ? 50 : 25;

            return (
              <div className="space-y-4">
                {/* ── Header row ─────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Action Plan</span>
                    <AiBadge />
                  </div>
                  {ticket.copilot_run_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ticket.copilot_run_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ── Step graph (2/3 width) ───────────────────────── */}
                  <div className="md:col-span-2 glass-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      {steps.length} step{steps.length !== 1 ? "s" : ""} recommended
                    </p>
                    <ol className="relative space-y-0">
                      {steps.map((step, idx) => {
                        const isLast = idx === steps.length - 1;
                        const icon = STEP_ICONS[idx % STEP_ICONS.length];
                        return (
                          <li key={idx} className="flex gap-4 group">
                            {/* Node + connector line */}
                            <div className="flex flex-col items-center">
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.08, type: "spring", stiffness: 400 }}
                                className="relative z-10 w-8 h-8 rounded-full bg-accent/15 border-2 border-accent/30 flex items-center justify-center text-accent shrink-0 group-hover:bg-accent/25 group-hover:border-accent/50 transition-all"
                              >
                                {icon}
                                {/* Step number */}
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center shadow-sm">
                                  {idx + 1}
                                </span>
                              </motion.div>
                              {/* Connecting line */}
                              {!isLast && (
                                <motion.div
                                  initial={{ scaleY: 0 }}
                                  animate={{ scaleY: 1 }}
                                  transition={{ delay: idx * 0.08 + 0.15, duration: 0.3 }}
                                  className="w-px flex-1 bg-gradient-to-b from-accent/40 to-accent/10 origin-top mt-1 mb-1 min-h-[28px]"
                                />
                              )}
                            </div>
                            {/* Step content */}
                            <motion.div
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.08 + 0.05 }}
                              className={`pb-5 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}
                            >
                              <p className="text-sm text-foreground leading-relaxed pt-1">{step}</p>
                            </motion.div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* ── Metrics panel (1/3 width) ────────────────────── */}
                  <div className="space-y-3">
                    {/* Risk */}
                    <div className={`glass-card p-4 border ${riskColor.bg} border-current/20`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Risk Level</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-lg font-display font-bold capitalize ${riskColor.text}`}>
                          {copilotData.risk_level}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColor.bg} ${riskColor.text}`}>
                          {riskColor.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${riskColor.pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${riskColor.bar}`}
                        />
                      </div>
                    </div>

                    {/* Effort */}
                    <div className="glass-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Effort Estimate</p>
                      <p className="text-sm font-semibold text-foreground mb-2">{copilotData.effort_estimate}</p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${effortPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          className="h-full rounded-full bg-accent"
                        />
                      </div>
                    </div>

                    {/* Steps count */}
                    <div className="glass-card p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <span className="text-lg font-display font-bold text-accent">{steps.length}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Action Steps</p>
                        <p className="text-[10px] text-muted-foreground">AI recommended</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Emergency flag */}
          {ticket.severity === "emergency" && (
            <div className="glass-card p-4 border-l-4 border-l-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-foreground">Urgent Sentiment Detected</span>
                <AiBadge />
              </div>
              <p className="text-sm text-muted-foreground mt-1">⚠️ Citizen tone is urgent. Use empathetic language in your response.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Tab: RESPOND ── */}
      {activeTab === "respond" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Draft Response</span>
              {hasCopilot && <AiBadge />}
              {hasCopilot && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI Generated
                </span>
              )}
            </div>
            <Textarea
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              className="rounded-xl min-h-[160px] text-sm mb-3"
              placeholder="Write your response…"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl gap-2 h-10"
                onClick={async () => {
                  if (!copilotData) return;
                  setSavingCopilot(true);
                  await persistCopilot(copilotData, draftResponse);
                }}
                disabled={savingCopilot}
              >
                {savingCopilot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2 h-10 bg-primary text-primary-foreground"
                onClick={handleSendMessage}
                disabled={sendingMessage || !draftResponse.trim()}
              >
                {sendingMessage
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send to Citizen</>}
              </Button>
            </div>
            {messageSent && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Message sent! The citizen will see this update on their ticket.
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AgentTicketDetail;
