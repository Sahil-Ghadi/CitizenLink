"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, MapPin, Clock, User2, Phone, Building2, Star,
    AlertTriangle, CheckCircle2, Loader2, ImageIcon,
    ChevronRight, Hash, Calendar, Layers, Sparkles, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    department: string;
    severity: string;
    status: string;
    location_address: string;
    latitude: number;
    longitude: number;
    photo_urls: string[];
    citizen_uid: string;
    citizen_name: string;
    citizen_email: string;
    agent_uid?: string;
    agent_name?: string;
    created_at: string;
    updated_at: string;
    priority_score: number;
    ai_summary?: string;
    ongoing?: boolean;
    start_date?: string;
    additional_info?: string;
    rating?: number;
    messages?: { id: string; from: string; sender_name: string; text: string; sent_at: string }[];
}

interface Props {
    ticket: Ticket | null;
    onClose: () => void;
}

// ── Timeline steps based on status ─────────────────────────────────────────
const TIMELINE = [
    { key: "submitted", label: "Submitted", icon: Hash },
    { key: "in-progress", label: "Under Review", icon: Loader2 },
    { key: "in-progress", label: "Agent Assigned", icon: User2 },
    { key: "resolved", label: "Resolved", icon: CheckCircle2 },
];

const STATUS_ORDER: Record<string, number> = {
    submitted: 0, "in-progress": 1, resolved: 3
};

const SEV_COLOR: Record<string, string> = {
    emergency: "text-red-400 bg-red-500/10 border-red-500/25",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/25",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    low: "text-green-400 bg-green-500/10 border-green-500/25",
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
    submitted: { label: "Submitted", color: "text-blue-400", dot: "bg-blue-400" },
    "in-progress": { label: "In Progress", color: "text-amber-400", dot: "bg-amber-400" },
    resolved: { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
    emergency: { label: "Emergency", color: "text-red-400", dot: "bg-red-400" },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function TicketDetailModal({ ticket, onClose }: Props) {
    const router = useRouter();

    if (!ticket) return null;

    // If in-progress AND agent is assigned → advance to step 2 (Agent Assigned),
    // otherwise in-progress stays at step 1 (Under Review)
    const statusIdx =
        ticket.status === "in-progress" && ticket.agent_name
            ? 2
            : (STATUS_ORDER[ticket.status] ?? 0);
    const statusMeta = STATUS_META[ticket.status] ?? STATUS_META["submitted"];
    const sevClass = SEV_COLOR[ticket.severity] ?? SEV_COLOR["medium"];

    return (
        <AnimatePresence>
            {ticket && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                        className="fixed inset-x-4 bottom-0 top-12 z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:top-8 md:bottom-8 overflow-hidden flex flex-col rounded-t-3xl md:rounded-3xl bg-card border border-border shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
                            <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${statusMeta.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                        {statusMeta.label}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${sevClass}`}>
                                        {ticket.severity}
                                    </span>
                                </div>
                                <h2 className="text-base font-display font-bold text-foreground leading-snug">{ticket.title}</h2>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    {ticket.department} · {ticket.category}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">

                            {/* Photos */}
                            {ticket.photo_urls?.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {ticket.photo_urls.map((url, i) => (
                                        <img
                                            key={i}
                                            src={url}
                                            alt={`Photo ${i + 1}`}
                                            className="h-40 w-auto rounded-2xl object-cover border border-border flex-shrink-0"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Progress timeline */}
                            <div className="glass-card p-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Progress</h3>
                                <div className="relative">
                                    {/* Vertical connector */}
                                    <div className="absolute left-3.5 top-3 bottom-3 w-px bg-border" />
                                    <div className="space-y-5">
                                        {TIMELINE.map((step, i) => {
                                            const done = i <= statusIdx;
                                            const active = i === statusIdx;
                                            const Icon = step.icon;
                                            return (
                                                <div key={i} className="flex items-start gap-3 relative">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${done
                                                        ? active
                                                            ? "bg-accent ring-2 ring-accent/30"
                                                            : "bg-status-resolved"
                                                        : "bg-secondary"
                                                        }`}>
                                                        <Icon className={`w-3.5 h-3.5 ${done ? "text-white" : "text-muted-foreground"} ${active && step.icon === Loader2 ? "animate-spin" : ""}`} />
                                                    </div>
                                                    <div className="pt-0.5">
                                                        <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                                                            {step.label}
                                                        </p>
                                                        {i === 0 && <p className="text-xs text-muted-foreground mt-0.5">{formatDate(ticket.created_at)}</p>}
                                                        {i === 2 && ticket.agent_name && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">Assigned to {ticket.agent_name}</p>
                                                        )}
                                                        {i === 3 && ticket.status === "resolved" && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(ticket.updated_at)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priority bar */}
                                <div className="mt-4 pt-4 border-t border-border">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                        <span>Priority Score</span>
                                        <span className="font-bold text-foreground">{ticket.priority_score}/100</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${ticket.priority_score}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={`h-full rounded-full ${ticket.priority_score >= 80 ? "bg-red-400" :
                                                ticket.priority_score >= 60 ? "bg-amber-400" : "bg-emerald-400"
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Agent */}
                            <div className="glass-card p-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assigned Agent</h3>
                                {ticket.agent_name ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                                            <User2 className="w-5 h-5 text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{ticket.agent_name}</p>
                                            <p className="text-xs text-muted-foreground">{ticket.department}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 opacity-60">
                                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                            <User2 className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pending assignment</p>
                                            <p className="text-xs text-muted-foreground">Usually within 24 hours</p>
                                        </div>
                                        <div className="ml-auto">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Summary */}
                            {ticket.ai_summary && (
                                <div className="glass-card p-4 border-l-4 border-l-accent">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-accent" />
                                        <span className="text-xs font-semibold text-accent uppercase tracking-wider">AI Summary</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{ticket.ai_summary}</p>
                                </div>
                            )}

                            {/* Agent Updates / Messages */}
                            {ticket.messages && ticket.messages.length > 0 && (
                                <div className="glass-card p-4">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5" /> Updates from Agent
                                    </h3>
                                    <div className="space-y-3">
                                        {ticket.messages.map((msg) => (
                                            <div key={msg.id} className="bg-secondary/60 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-semibold text-foreground">{msg.sender_name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(msg.sent_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{msg.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="glass-card p-4 space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Details</h3>

                                {ticket.description && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                                        <p className="text-sm text-foreground leading-relaxed">{ticket.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                                        <p className="font-medium text-foreground">{ticket.category || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                                        <p className="font-medium text-foreground capitalize">{ticket.ongoing ? "Ongoing" : "One-time"}</p>
                                    </div>
                                    {ticket.start_date && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Started</p>
                                            <p className="font-medium text-foreground">{new Date(ticket.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Reported</p>
                                        <p className="font-medium text-foreground">{formatDate(ticket.created_at)}</p>
                                    </div>
                                </div>

                                {ticket.additional_info && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Additional Notes</p>
                                        <p className="text-sm text-foreground">{ticket.additional_info}</p>
                                    </div>
                                )}
                            </div>

                            {/* Location */}
                            <div className="glass-card p-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</h3>
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground">{ticket.location_address || `${ticket.latitude?.toFixed(5)}, ${ticket.longitude?.toFixed(5)}`}</p>
                                </div>
                                {ticket.latitude && ticket.longitude && (
                                    <a
                                        href={`https://maps.google.com/?q=${ticket.latitude},${ticket.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                    >
                                        Open in Google Maps <ChevronRight className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {/* Rating (if resolved) */}
                            {ticket.status === "resolved" && (
                                <div className="glass-card p-4">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Satisfaction Rating</h3>
                                    {ticket.rating != null ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={`w-5 h-5 ${i < ticket.rating! ? "text-accent fill-accent" : "text-border"}`} />
                                                ))}
                                            </div>
                                            <span className="text-sm text-muted-foreground">{ticket.rating}/5</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not yet rated</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-4 border-t border-border flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Close</Button>
                            <Button
                                className="flex-1 rounded-xl bg-primary text-primary-foreground gap-2"
                                onClick={() => {
                                    onClose();
                                    router.push("/report");
                                }}
                            >
                                Report New Issue
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
