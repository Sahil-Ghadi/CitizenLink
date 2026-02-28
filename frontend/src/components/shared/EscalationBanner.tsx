"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle, Siren, AlertOctagon,
    CheckCircle2, RefreshCcw, UserCheck, Loader2,
    ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { getIdToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Level config ──────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
    1: {
        icon: AlertTriangle,
        label: "SLA Breach",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        ring: "ring-amber-500/20",
        dot: "bg-amber-400",
    },
    2: {
        icon: Siren,
        label: "Citizen Reopen",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
        ring: "ring-orange-500/20",
        dot: "bg-orange-400",
    },
    3: {
        icon: AlertOctagon,
        label: "Critical",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        ring: "ring-red-500/20",
        dot: "bg-red-400",
    },
} as const;

function fmtElapsed(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h overdue`;
    if (h > 0) return `${h}h ${m}m overdue`;
    return `${m}m overdue`;
}

interface EscalationBannerProps {
    ticketId: string;
    level?: number;
    reason?: string;
    escalatedAt?: string;
    acknowledged?: boolean;
    onAcknowledge?: () => void;
}

export default function EscalationBanner({
    ticketId,
    level = 1,
    reason,
    escalatedAt,
    acknowledged,
    onAcknowledge,
}: EscalationBannerProps) {
    const [expanded, setExpanded] = useState(true);
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [ackLoading, setAckLoading] = useState(false);
    const [ackDone, setAckDone] = useState(acknowledged ?? false);
    const [error, setError] = useState("");

    const cfg = LEVEL_CONFIG[level as 1 | 2 | 3] ?? LEVEL_CONFIG[1];
    const Icon = cfg.icon;

    const handleAcknowledge = async () => {
        setAckLoading(true);
        setError("");
        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/escalation/${ticketId}/acknowledge`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to acknowledge");
            setAckDone(true);
            onAcknowledge?.();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setAckLoading(false);
        }
    };

    const handleGetSummary = async () => {
        if (summary) { setShowSummary((v) => !v); return; }
        setSummaryLoading(true);
        setError("");
        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/escalation/summary/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Summary failed");
            const data = await res.json();
            setSummary(data.summary);
            setShowSummary(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSummaryLoading(false);
        }
    };

    // Collapsed acknowledged state — just a thin green bar
    if (ackDone) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20"
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-medium">Escalation acknowledged</span>
                {escalatedAt && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{fmtElapsed(escalatedAt)}</span>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}
        >
            {/* Header row */}
            <div className="flex items-start gap-3 px-4 py-3.5">
                {/* Pulsing icon */}
                <div className={`relative w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className={`absolute inset-0 rounded-xl ${cfg.dot} opacity-20 animate-ping`} />
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                            ⚠ Escalated — {cfg.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} font-semibold`}>
                            Level {level}
                        </span>
                    </div>
                    {escalatedAt && (
                        <div className={`flex items-center gap-1 mt-0.5 text-[11px] ${cfg.text} opacity-75`}>
                            <Clock className="w-3 h-3" />
                            {fmtElapsed(escalatedAt)}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expandable body */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-inherit overflow-hidden"
                    >
                        <div className="px-4 py-3 space-y-3">
                            {/* Reason */}
                            {reason && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-semibold text-foreground">Reason: </span>{reason}
                                </p>
                            )}

                            {/* AI Summary */}
                            <AnimatePresence>
                                {showSummary && summary && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-violet-500/8 border border-violet-500/20 rounded-xl px-4 py-3"
                                    >
                                        <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-1.5">
                                            ✦ AI Escalation Briefing
                                        </p>
                                        <p className="text-xs text-foreground leading-relaxed">{summary}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            {error && <p className="text-xs text-destructive">{error}</p>}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                                {/* Acknowledge */}
                                <button
                                    onClick={handleAcknowledge}
                                    disabled={ackLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 transition-all disabled:opacity-50"
                                >
                                    {ackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    Acknowledge
                                </button>

                                {/* Get AI Summary */}
                                <button
                                    onClick={handleGetSummary}
                                    disabled={summaryLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/25 transition-all disabled:opacity-50"
                                >
                                    {summaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    {showSummary ? "Hide Summary" : "AI Briefing"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
