"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map as MapIcon, Loader2, TrendingUp, AlertTriangle,
    Users, MapPin, ChevronRight, Flame, BarChart3
} from "lucide-react";
import { useAgentTickets } from "@/hooks/use-tickets";
import dynamic from "next/dynamic";

const TicketHeatmap = dynamic(
    () => import("@/components/shared/TicketHeatmap"),
    {
        ssr: false,
        loading: () => <div className="w-full h-full min-h-[500px] rounded-2xl bg-secondary animate-pulse" />
    }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the most meaningful locality name from a full address string */
function getLocality(address: string): string {
    if (!address) return "Unknown";
    // try to get first meaningful part (before first comma usually = street/area)
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    // prefer the 2nd or 3rd segment which is usually city/area name
    return parts[1] ?? parts[0] ?? "Unknown";
}

interface Insight {
    location: string;
    category: string;
    count: number;
    topSeverity: string;
    ids: string[];
    avgLat: number;
    avgLng: number;
}

const SEV_ORDER: Record<string, number> = { emergency: 4, high: 3, medium: 2, low: 1 };
const SEV_COLOR: Record<string, string> = {
    emergency: "text-red-400",
    high: "text-orange-400",
    medium: "text-amber-400",
    low: "text-emerald-400",
};
const SEV_DOT: Record<string, string> = {
    emergency: "bg-red-400",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
};

const CATEGORY_EMOJI: Record<string, string> = {
    "road": "🚧", "pothole": "🕳️", "water": "💧", "electricity": "⚡",
    "garbage": "🗑️", "sewage": "🚰", "streetlight": "💡", "footpath": "🚶",
    "park": "🌳", "noise": "🔊", "building": "🏗️", "other": "📌",
};

function getCategoryEmoji(cat: string): string {
    const lower = cat.toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
        if (lower.includes(key)) return emoji;
    }
    return "📌";
}

export default function AgentMapPage() {
    const { tickets, loading } = useAgentTickets();
    const [isMounted, setIsMounted] = useState(false);
    const [activeInsight, setActiveInsight] = useState<number | null>(null);
    const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

    useEffect(() => { setIsMounted(true); }, []);

    const validTickets = tickets.filter(t =>
        t.latitude && t.longitude &&
        t.status !== "resolved" && t.status !== "auto-resolved"
    );

    // ── Compute insights: group by locality × category ────────────────────────
    const insights = useMemo<Insight[]>(() => {
        const map: Record<string, { counts: Record<string, number>; severities: string[]; ids: string[]; lats: number[]; lngs: number[] }> = {};

        for (const t of validTickets) {
            const loc = getLocality((t as any).location_address ?? "");
            const cat = (t as any).category ?? "Other";
            const key = `${loc}|||${cat}`;
            if (!map[key]) map[key] = { counts: {}, severities: [], ids: [], lats: [], lngs: [] };
            map[key].counts[cat] = (map[key].counts[cat] || 0) + 1;
            map[key].severities.push(t.severity);
            map[key].ids.push(t.id);
            if (t.latitude) map[key].lats.push(t.latitude as number);
            if (t.longitude) map[key].lngs.push(t.longitude as number);
        }

        return Object.entries(map)
            .map(([key, val]) => {
                const [location, category] = key.split("|||");
                const count = val.ids.length;
                const topSeverity = val.severities.reduce((a, b) =>
                    (SEV_ORDER[a] ?? 0) >= (SEV_ORDER[b] ?? 0) ? a : b, "low");
                const avgLat = val.lats.reduce((a, b) => a + b, 0) / (val.lats.length || 1);
                const avgLng = val.lngs.reduce((a, b) => a + b, 0) / (val.lngs.length || 1);
                return { location, category, count, topSeverity, ids: val.ids, avgLat, avgLng };
            })
            .filter((ins) => ins.location !== "Unknown" && ins.avgLat && ins.avgLng)
            .sort((a, b) => b.count - a.count || (SEV_ORDER[b.topSeverity] ?? 0) - (SEV_ORDER[a.topSeverity] ?? 0))
            .slice(0, 12);
    }, [validTickets]);

    // ── Top-level stats ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const catCounts: Record<string, number> = {};
        const locCounts: Record<string, number> = {};
        for (const t of validTickets) {
            const cat = (t as any).category ?? "Other";
            const loc = getLocality((t as any).location_address ?? "");
            catCounts[cat] = (catCounts[cat] || 0) + 1;
            if (loc !== "Unknown") locCounts[loc] = (locCounts[loc] || 0) + 1;
        }
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
        const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0];
        return { topCat, topLoc };
    }, [validTickets]);

    return (
        <div className="max-w-7xl mx-auto space-y-4 h-[calc(100vh-6rem)] flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between shrink-0"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                            <MapIcon className="w-4 h-4 text-accent" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Live Heatmap</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading map data..." : `Tracking ${validTickets.length} active issues across ${Object.keys({} as any).length} locations`}
                    </p>
                </div>

                {/* Legend */}
                {!loading && (
                    <div className="glass-card px-4 py-2 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                        {(["emergency", "high", "medium", "low"] as const).map((s) => (
                            <span key={s} className="flex items-center gap-1.5 capitalize">
                                <span className={`w-2.5 h-2.5 rounded-full ${SEV_DOT[s]}`} /> {s}
                            </span>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Main layout: map + insight sidebar */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 min-h-0">

                {/* Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-0 overflow-hidden relative"
                    style={{ borderRadius: "1rem", border: "1px solid hsl(var(--border))" }}
                >
                    {loading || !isMounted ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                            <p className="text-sm font-medium">Initializing Map Engine...</p>
                        </div>
                    ) : (
                        <div className="w-full h-full relative z-0">
                            <TicketHeatmap
                                points={validTickets.map((t) => ({
                                    lat: (t as any).latitude,
                                    lng: (t as any).longitude,
                                    severity: t.severity,
                                    title: t.title
                                }))}
                                height={800}
                                focusPoint={focusPoint}
                            />
                        </div>
                    )}
                </motion.div>

                {/* ── Insights Panel ─────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col gap-3 min-h-0 overflow-hidden"
                >
                    {/* Quick stat pills */}
                    {!loading && (
                        <div className="grid grid-cols-2 gap-2 shrink-0">
                            <div className="glass-card p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Flame className="w-3 h-3 text-orange-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hot Spot</span>
                                </div>
                                <p className="text-sm font-bold text-foreground truncate">{stats.topLoc?.[0] ?? "—"}</p>
                                <p className="text-[10px] text-muted-foreground">{stats.topLoc?.[1] ?? 0} active tickets</p>
                            </div>
                            <div className="glass-card p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <BarChart3 className="w-3 h-3 text-accent" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Issue</span>
                                </div>
                                <p className="text-sm font-bold text-foreground truncate">{stats.topCat?.[0] ?? "—"}</p>
                                <p className="text-[10px] text-muted-foreground">{stats.topCat?.[1] ?? 0} reports</p>
                            </div>
                        </div>
                    )}

                    {/* Insights list */}
                    <div className="glass-card p-4 flex flex-col gap-3 flex-1 min-h-0">
                        <div className="flex items-center gap-2 shrink-0">
                            <TrendingUp className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-foreground">Location Insights</span>
                            {!loading && (
                                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                                    Live
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
                                ))}
                            </div>
                        ) : insights.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                                <MapPin className="w-8 h-8 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">No location data yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                                {insights.map((ins, i) => (
                                    <motion.button
                                        key={`${ins.location}-${ins.category}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => {
                                            const isActive = activeInsight === i;
                                            setActiveInsight(isActive ? null : i);
                                            if (!isActive) {
                                                setFocusPoint({ lat: ins.avgLat, lng: ins.avgLng, zoom: ins.count > 3 ? 14 : 16 });
                                            } else {
                                                setFocusPoint(null);
                                            }
                                        }}
                                        className="w-full text-left group"
                                    >
                                        <div className={`rounded-xl px-3 py-2.5 border transition-all duration-200 ${activeInsight === i
                                            ? "bg-accent/10 border-accent/30"
                                            : "bg-secondary/40 border-border hover:bg-secondary hover:border-border"
                                            }`}>
                                            <div className="flex items-start gap-2.5">
                                                {/* Category emoji + severity dot */}
                                                <div className="relative shrink-0 mt-0.5">
                                                    <span className="text-lg leading-none">{getCategoryEmoji(ins.category)}</span>
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${SEV_DOT[ins.topSeverity]}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    {/* Insight sentence */}
                                                    <p className="text-xs font-semibold text-foreground leading-tight">
                                                        <span className={SEV_COLOR[ins.topSeverity]}>{ins.count}</span>
                                                        {" "}report{ins.count !== 1 ? "s" : ""} from{" "}
                                                        <span className="text-foreground">{ins.location}</span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                        {ins.category} · {ins.topSeverity} severity
                                                    </p>
                                                </div>

                                                {/* Count badge */}
                                                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${SEV_DOT[ins.topSeverity]} text-white`}>
                                                    {ins.count}
                                                </div>
                                            </div>

                                            {/* Expanded: show ticket IDs */}
                                            <AnimatePresence>
                                                {activeInsight === i && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                                                            {ins.ids.slice(0, 6).map((id) => (
                                                                <span key={id} className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                                                                    {id}
                                                                </span>
                                                            ))}
                                                            {ins.ids.length > 6 && (
                                                                <span className="text-[9px] text-muted-foreground px-1">+{ins.ids.length - 6} more</span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
