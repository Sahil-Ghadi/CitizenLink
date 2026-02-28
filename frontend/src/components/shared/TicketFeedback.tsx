"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Star, CheckCircle2, RotateCcw, AlertTriangle,
    ThumbsUp, ThumbsDown, Loader2, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getIdToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Low-rating label
// ─────────────────────────────────────────────────────────────────────────────
const RATING_LABELS: Record<number, { text: string; color: string }> = {
    1: { text: "Very poor — not resolved", color: "text-red-400" },
    2: { text: "Poor — still issues", color: "text-orange-400" },
    3: { text: "Okay — partial resolution", color: "text-amber-400" },
    4: { text: "Good — mostly resolved", color: "text-emerald-400" },
    5: { text: "Excellent — fully resolved", color: "text-emerald-400" },
};

interface TicketFeedbackProps {
    ticketId: string;
    /** Pass existing rating if citizen already rated */
    existingRating?: number | null;
    existingFeedback?: string | null;
    /** If status is "reopened" we show a banner instead of the form */
    isReopened?: boolean;
    /** Callback so parent can refresh ticket state without full reload */
    onUpdate?: (update: { rating?: number; status?: string }) => void;
}

type Stage =
    | "rating"       // Star picker
    | "feedback"     // Optional text + confirm after picking stars
    | "reopen"       // Low rating → offer reopen
    | "done_rated"   // Rated, high enough, all good
    | "done_reopened"// Reopened
    | "already"      // Already rated (non-reopened)
    | "reopened_banner"; // Ticket is already in 'reopened' state

export default function TicketFeedback({
    ticketId,
    existingRating,
    existingFeedback,
    isReopened,
    onUpdate,
}: TicketFeedbackProps) {
    const [stage, setStage] = useState<Stage>(
        isReopened ? "reopened_banner" : existingRating != null ? "already" : "rating"
    );
    const [hover, setHover] = useState(0);
    const [picked, setPicked] = useState(existingRating ?? 0);
    const [feedback, setFeedback] = useState(existingFeedback ?? "");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const displayRating = hover || picked;

    // ── Rate ──────────────────────────────────────────────────────────────────
    const submitRating = async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/tickets/${ticketId}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ rating: picked, feedback: feedback.trim() || undefined }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({ detail: "Rating failed" }));
                throw new Error(e.detail);
            }
            onUpdate?.({ rating: picked });
            // If rating is low, offer reopen; otherwise done
            setStage(picked <= 2 ? "reopen" : "done_rated");
        } catch (e: any) {
            setError(e.message ?? "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // ── Reopen ────────────────────────────────────────────────────────────────
    const submitReopen = async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/tickets/${ticketId}/reopen`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: reason.trim() || undefined }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({ detail: "Reopen failed" }));
                throw new Error(e.detail);
            }
            onUpdate?.({ status: "reopened" });
            setStage("done_reopened");
        } catch (e: any) {
            setError(e.message ?? "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            {/* ── Already reopened banner ── */}
            {stage === "reopened_banner" && (
                <div className="p-5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Ticket Reopened</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Your ticket has been reopened and sent back to an agent for further review. We'll notify you once it's resolved.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Rated (already) read-only display ── */}
            {stage === "already" && existingRating != null && (
                <div className="p-5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Rating</p>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-5 h-5 ${i < existingRating ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                            ))}
                        </div>
                        <span className={`text-sm font-medium ${RATING_LABELS[existingRating]?.color}`}>
                            {RATING_LABELS[existingRating]?.text}
                        </span>
                    </div>
                    {existingFeedback && (
                        <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-border pl-3">
                            "{existingFeedback}"
                        </p>
                    )}
                </div>
            )}

            {/* ── Stage: picking stars ── */}
            {stage === "rating" && (
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                            <Star className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">How was the resolution?</p>
                            <p className="text-xs text-muted-foreground">Your feedback helps improve CitizenLink</p>
                        </div>
                    </div>

                    {/* Star picker */}
                    <div className="flex gap-2 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => {
                            const n = i + 1;
                            const filled = n <= displayRating;
                            return (
                                <motion.button
                                    key={n}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onMouseEnter={() => setHover(n)}
                                    onMouseLeave={() => setHover(0)}
                                    onClick={() => { setPicked(n); setStage("feedback"); }}
                                    className="focus:outline-none"
                                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                                >
                                    <Star
                                        className={`w-9 h-9 transition-colors ${filled ? "text-amber-400 fill-amber-400" : "text-border hover:text-amber-300"}`}
                                    />
                                </motion.button>
                            );
                        })}
                    </div>

                    {displayRating > 0 && (
                        <motion.p
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-xs font-medium ${RATING_LABELS[displayRating]?.color}`}
                        >
                            {RATING_LABELS[displayRating]?.text}
                        </motion.p>
                    )}
                </div>
            )}

            {/* ── Stage: optional feedback text + submit ── */}
            {stage === "feedback" && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-6 h-6 transition-colors cursor-pointer ${i < picked ? "text-amber-400 fill-amber-400" : "text-border"}`}
                                    onClick={() => { setPicked(i + 1); }}
                                />
                            ))}
                        </div>
                        <span className={`text-xs font-medium ${RATING_LABELS[picked]?.color}`}>
                            {RATING_LABELS[picked]?.text}
                        </span>
                    </div>

                    {/* Warning hint for low ratings */}
                    {picked <= 2 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20"
                        >
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-400/90 leading-relaxed">
                                Low ratings let you <strong>reopen this ticket</strong> so an agent can address the remaining issues.
                            </p>
                        </motion.div>
                    )}

                    <div>
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5 block">
                            Additional comments (optional)
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={picked <= 2 ? "Tell us what wasn't resolved properly…" : "Anything else you'd like to share?"}
                            rows={3}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none transition-all"
                        />
                    </div>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setStage("rating")}
                            className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        >
                            Back
                        </button>
                        <Button
                            onClick={submitRating}
                            disabled={loading}
                            className="flex-1 rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : picked >= 4
                                    ? <ThumbsUp className="w-4 h-4" />
                                    : <ThumbsDown className="w-4 h-4" />
                            }
                            {loading ? "Submitting…" : "Submit Rating"}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* ── Stage: low rating → offer reopen ── */}
            {stage === "reopen" && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Issue not fully resolved?</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                You gave this a low rating. You can reopen the ticket so an agent will take another look.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5 block flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> What's still wrong? (optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. The road is still broken / water supply hasn't resumed…"
                            rows={3}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40 resize-none transition-all"
                        />
                    </div>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setStage("done_rated")}
                            className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        >
                            No thanks
                        </button>
                        <Button
                            onClick={submitReopen}
                            disabled={loading}
                            className="flex-1 rounded-xl gap-2 bg-orange-500 hover:bg-orange-500/90 text-white border-0"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            {loading ? "Reopening…" : "Reopen Ticket"}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* ── Stage: done (high rating) ── */}
            {stage === "done_rated" && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="p-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Thank you for your feedback!</p>
                        <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < picked ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Stage: done (reopened) ── */}
            {stage === "done_reopened" && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="p-5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Ticket Reopened</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            An agent has been notified and will review your complaint again. We'll keep you updated on the progress.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
