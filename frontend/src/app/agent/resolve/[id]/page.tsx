"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Upload, CheckCircle, Check, Phone, Loader2, X,
  Sparkles, AlertTriangle, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/shared/StatusBadge";
import { useTicketById } from "@/hooks/use-tickets";
import { getIdToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const resolutionTypes = ["Repair Completed", "Issue Redirected", "No Action Needed", "Duplicate Closed"];

const CHECKLIST = [
  { key: "has_note", label: "Resolution note describes action taken" },
  { key: "has_proof", label: "Proof/evidence uploaded" },
  { key: "has_type", label: "Resolution type selected" },
  { key: "ai_valid", label: "AI validation passed" },
] as const;
type CheckKey = typeof CHECKLIST[number]["key"];

const ResolveTicket = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { ticket, loading } = useTicketById(id);

  const [note, setNote] = useState("");
  const [resType, setResType] = useState("");
  const [resolved, setResolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // AI validation
  const [validating, setValidating] = useState(false);
  const [aiResult, setAiResult] = useState<{ valid: boolean; reason: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Auto-computed checklist
  const checks: Record<CheckKey, boolean> = {
    has_note: note.trim().length > 20,
    has_proof: !!proofUrl,
    has_type: resType.length > 0,
    ai_valid: aiResult?.valid === true,
  };
  const allChecked = Object.values(checks).every(Boolean);

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setProofPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BASE_URL}/tickets/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      setProofUrl(data.url ?? data.secure_url ?? "");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setProofPreview(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── AI Validation ────────────────────────────────────────────────────────
  const handleAiValidate = useCallback(async () => {
    if (!ticket) return;
    setValidating(true);
    setAiError(null);
    setAiResult(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${BASE_URL}/agents/validate-resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_id: ticket.id, resolution_note: note, proof_url: proofUrl ?? "" }),
      });
      if (!res.ok) throw new Error(`Validation error (${res.status})`);
      const data = await res.json();
      setAiResult({ valid: data.resolution_valid, reason: data.reason ?? "" });
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }, [ticket, note, proofUrl]);

  // ── Submit resolution to Firestore ───────────────────────────────────────
  const handleSubmitResolution = useCallback(async () => {
    if (!ticket || !allChecked) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${BASE_URL}/tickets/${ticket.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resolution_note: note,
          proof_url: proofUrl ?? "",
          resolution_type: resType,
        }),
      });
      if (!res.ok) throw new Error(`Failed to resolve ticket (${res.status})`);
      setResolved(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit resolution");
    } finally {
      setSubmitting(false);
    }
  }, [ticket, allChecked, note, proofUrl, resType]);

  // ── Loading / not-found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-5 bg-secondary rounded w-20" />
        <div className="h-8 bg-secondary rounded w-1/2" />
        <div className="glass-card p-4 h-32" />
      </div>
    );
  }

  if (!ticket) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Ticket not found</p>
      <button onClick={() => router.push("/agent/queue")} className="mt-4 text-sm text-accent hover:underline">Back to Queue</button>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────
  if (resolved) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mt-12 text-center">
        <div className="glass-card-elevated p-8">
          <div className="w-16 h-16 rounded-full bg-status-resolved/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-status-resolved" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Ticket Resolved</h2>
          <p className="text-sm text-muted-foreground mt-2">{ticket.id} has been marked as resolved in Firestore</p>
          {proofPreview && (
            <img src={proofPreview} alt="Proof" className="w-full h-32 object-cover rounded-xl mt-4 border border-border" />
          )}
          <div className="glass-card p-3 mt-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Citizen SMS Preview</span>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary p-3 rounded-xl">
              &quot;Dear {ticket.citizen_name}, your complaint {ticket.id} has been resolved. If unsatisfied, you can reopen within 7 days. — CitizenPortal&quot;
            </p>
          </div>
          <Button className="mt-6 rounded-xl bg-primary text-primary-foreground w-full" onClick={() => router.push("/agent/queue")}>
            Back to Queue
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Resolve Ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">{ticket.id} — {ticket.title}</p>
      </div>

      <div className="space-y-4">
        {/* Resolution Note */}
        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Resolution Note</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe what action was taken to resolve the issue… (min 20 chars)"
            className="rounded-xl min-h-[100px]"
          />
          {note.length > 0 && note.length < 20 && (
            <p className="text-xs text-muted-foreground mt-1">{20 - note.length} more characters needed</p>
          )}
        </div>

        {/* Proof Upload */}
        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Proof Upload</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          {proofPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={proofPreview} alt="Proof preview" className="w-full h-40 object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center gap-2 text-sm text-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Uploading…
                </div>
              )}
              {!uploading && (
                <button
                  onClick={() => { setProofPreview(null); setProofUrl(null); setUploadError(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {proofUrl && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-status-resolved/90 text-white text-xs px-2 py-1 rounded-lg">
                  <Check className="w-3 h-3" /> Uploaded
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/10 transition-colors">
                <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — proof of resolution</p>
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {uploadError}
            </p>
          )}
        </div>

        {/* Resolution Type */}
        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Resolution Type</label>
          <div className="grid grid-cols-2 gap-2">
            {resolutionTypes.map((rt) => (
              <button
                key={rt}
                onClick={() => setResType(rt)}
                className={`p-3 rounded-xl text-sm text-left border transition-all ${resType === rt ? "border-accent bg-accent/5 text-foreground font-medium" : "border-border text-muted-foreground hover:border-accent/50"}`}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>

        {/* AI Quality Check */}
        <div className="glass-card p-4 border-l-4 border-l-accent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Resolution Quality Check</span>
              <AiBadge />
            </div>
            <button
              onClick={handleAiValidate}
              disabled={validating || !note || !proofUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {validating ? "Validating…" : "Run AI Check"}
            </button>
          </div>

          <AnimatePresence>
            {aiResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={`mb-3 p-3 rounded-xl text-xs flex items-start gap-2 ${aiResult.valid ? "bg-status-resolved/10 border border-status-resolved/20 text-status-resolved" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}
              >
                {aiResult.valid ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{aiResult.reason}</span>
              </motion.div>
            )}
            {aiError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {aiError}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {CHECKLIST.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checks[key] ? "bg-status-resolved border-status-resolved" : "border-border"}`}>
                  {checks[key] && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={`text-sm ${checks[key] ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
          {!proofUrl && (
            <p className="text-xs text-muted-foreground mt-3">Upload proof and add a note to enable AI validation</p>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {submitError}
          </p>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmitResolution}
          disabled={!allChecked || submitting}
          className={`w-full h-12 rounded-xl font-semibold gap-2 ${allChecked && !submitting ? "bg-status-resolved text-primary-foreground hover:bg-status-resolved/90" : "bg-muted text-muted-foreground"}`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {submitting ? "Saving…" : "Mark as Resolved"}
        </Button>
      </div>
    </div>
  );
};

export default ResolveTicket;
