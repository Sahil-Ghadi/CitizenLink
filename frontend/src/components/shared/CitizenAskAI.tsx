"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, Send, Loader2, Sparkles, X,
    MessageCircle, History, RotateCcw,
} from "lucide-react";
import { getIdToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────
interface QA {
    id: string;
    question: string;
    answer: string;
    asked_at: string;
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
        day: "numeric", month: "short",
    });
}

// ── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
    "What does this update mean?",
    "What happens next with my complaint?",
    "How long will the resolution take?",
    "Is my issue being actively worked on?",
];

interface CitizenAskAIProps {
    ticketId: string;
    messageCount?: number;
}

export default function CitizenAskAI({ ticketId, messageCount = 0 }: CitizenAskAIProps) {
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState<QA[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Fetch persisted history ────────────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        setFetching(true);
        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/chat/${ticketId}/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.history ?? []);
            }
        } catch { /* silently ignore */ }
        finally { setFetching(false); }
    }, [ticketId]);

    // Load history when panel opens for the first time
    useEffect(() => {
        if (open && history.length === 0 && !fetching) {
            loadHistory();
        }
        // Focus input when opening
        if (open) setTimeout(() => inputRef.current?.focus(), 250);
    }, [open]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history.length, open, loading]);

    // ── Ask ────────────────────────────────────────────────────────────────────
    const handleAsk = async (overrideQ?: string) => {
        const q = (overrideQ ?? input).trim();
        if (!q || loading) return;
        setInput("");
        setLoading(true);
        setError("");

        // Optimistic: show question bubble immediately
        const tempId = `temp_${Date.now()}`;
        const optimistic: QA = { id: tempId, question: q, answer: "", asked_at: new Date().toISOString() };
        setHistory((prev) => [...prev, optimistic]);

        try {
            const token = await getIdToken();
            const res = await fetch(`${BACKEND_URL}/chat/${ticketId}/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ question: q }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Request failed" }));
                throw new Error(err.detail ?? "Request failed");
            }
            const qa: QA = await res.json();
            // Replace optimistic entry with real one
            setHistory((prev) => prev.map((item) => (item.id === tempId ? qa : item)));
        } catch (e: any) {
            setError(e.message ?? "Something went wrong. Please try again.");
            // Remove optimistic entry on error
            setHistory((prev) => prev.filter((item) => item.id !== tempId));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
    };

    const hasHistory = history.length > 0;

    return (
        <>
            {/* ── Floating trigger button (when closed) ── */}
            {!open && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    onClick={() => setOpen(true)}
                    className="w-full glass-card px-5 py-4 flex items-center gap-3 hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer text-left group"
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        {hasHistory && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-[9px] font-bold text-white">
                                {history.length > 9 ? "9+" : history.length}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                            Ask AI about your ticket
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {hasHistory
                                ? `${history.length} previous question${history.length > 1 ? "s" : ""} · tap to continue`
                                : messageCount > 0
                                    ? `Get clarity on the ${messageCount} update${messageCount > 1 ? "s" : ""}`
                                    : "Ask about status, next steps, or updates"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 font-semibold">
                            Gemini AI
                        </span>
                        <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                </motion.button>
            )}

            {/* ── Expanded chat panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="glass-card flex flex-col overflow-hidden"
                        style={{ minHeight: "420px", maxHeight: "560px" }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
                                <Bot className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    CitizenLink AI Assistant
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 font-bold tracking-wide">
                                        GEMINI
                                    </span>
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {fetching ? "Loading your conversation…" : `${hasHistory ? `${history.length} question${history.length > 1 ? "s" : ""} in this session` : "Ask me anything about this ticket"}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {hasHistory && (
                                    <button
                                        onClick={loadHistory}
                                        title="Refresh history"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                            {/* Loading history state */}
                            {fetching && (
                                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Loading conversation…</span>
                                </div>
                            )}

                            {/* Welcome + suggestions */}
                            {!fetching && !hasHistory && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                    {/* Intro message */}
                                    <div className="flex gap-3 items-start mb-5">
                                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="bg-gradient-to-br from-violet-500/8 to-indigo-500/8 border border-violet-500/15 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                                            <p className="text-sm text-foreground leading-relaxed">
                                                👋 Hi! I have full context of your ticket and any agent updates.
                                                Ask me anything — I'll do my best to explain what's happening and what to expect next.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggestion chips */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] text-muted-foreground font-medium px-1">Suggested questions</p>
                                        {SUGGESTIONS.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleAsk(s)}
                                                disabled={loading}
                                                className="w-full text-left text-xs px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-border hover:border-accent/30 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Q&A history */}
                            {!fetching && hasHistory && (
                                <div className="space-y-5">
                                    {/* History label */}
                                    {history.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <History className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground font-medium">Conversation history</span>
                                            <div className="flex-1 h-px bg-border" />
                                        </div>
                                    )}

                                    {history.map((qa, idx) => (
                                        <motion.div
                                            key={qa.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="space-y-3"
                                        >
                                            {/* Question — right aligned */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[82%]">
                                                    <div className="bg-accent text-accent-foreground text-sm rounded-2xl rounded-br-sm px-4 py-3 leading-relaxed shadow-sm">
                                                        {qa.question}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground text-right mt-1 pr-1">
                                                        {fmtTime(qa.asked_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Answer — left aligned */}
                                            <div className="flex gap-2.5 items-start">
                                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="max-w-[85%]">
                                                    {qa.answer ? (
                                                        <div className="bg-gradient-to-br from-violet-500/8 to-indigo-500/8 border border-violet-500/15 text-foreground text-sm rounded-2xl rounded-tl-sm px-4 py-3 leading-relaxed shadow-sm">
                                                            {qa.answer}
                                                        </div>
                                                    ) : (
                                                        /* Typing indicator for optimistic (loading) entry */
                                                        <div className="bg-gradient-to-br from-violet-500/8 to-indigo-500/8 border border-violet-500/15 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Suggestion chips after first answer */}
                            {!fetching && hasHistory && !loading && (
                                <div className="pt-1">
                                    <p className="text-[10px] text-muted-foreground mb-2 font-medium">Quick follow-ups</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTIONS.slice(0, 2).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleAsk(s)}
                                                disabled={loading}
                                                className="text-[11px] px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border hover:border-violet-500/30 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mx-5 mb-1"
                                >
                                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                                        {error}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input bar */}
                        <div className="px-4 pb-4 pt-3 border-t border-border shrink-0">
                            <div className="flex gap-2 items-center">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything about this ticket…"
                                    disabled={loading || fetching}
                                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all disabled:opacity-60"
                                />
                                <button
                                    onClick={() => handleAsk()}
                                    disabled={loading || fetching || !input.trim()}
                                    className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all shadow-md shadow-violet-500/25"
                                >
                                    {loading
                                        ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        : <Send className="w-4 h-4 text-white" />
                                    }
                                </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-2">
                                AI has context of your ticket details and all agent updates
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
