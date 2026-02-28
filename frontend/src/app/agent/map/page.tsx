"use client";
import { motion } from "framer-motion";
import { Map as MapIcon, Loader2, Sparkles } from "lucide-react";
import { useAgentTickets } from "@/hooks/use-tickets";
import dynamic from "next/dynamic";

const TicketHeatmap = dynamic(
    () => import("@/components/shared/TicketHeatmap"),
    {
        ssr: false,
        loading: () => <div className="w-full h-full min-h-[500px] rounded-2xl bg-secondary animate-pulse" />
    }
);

export default function AgentMapPage() {
    const { tickets, loading } = useAgentTickets();
    const validTickets = tickets.filter(t => t.latitude && t.longitude && t.status !== "resolved" && t.status !== "auto-resolved");

    return (
        <div className="max-w-6xl mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col">
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
                        {loading ? "Loading map data..." : `Tracking ${validTickets.length} active issues geographically`}
                    </p>
                </div>

                {/* Legend */}
                {!loading && (
                    <div className="glass-card px-4 py-2 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1.5 capitalize">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" /> Emergency
                        </span>
                        <span className="flex items-center gap-1.5 capitalize">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" /> High
                        </span>
                        <span className="flex items-center gap-1.5 capitalize">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> Medium
                        </span>
                        <span className="flex items-center gap-1.5 capitalize">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> Low
                        </span>
                    </div>
                )}
            </motion.div>

            {/* Map Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 glass-card p-0 overflow-hidden flex flex-col relative"
                style={{
                    borderRadius: "1rem",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.05)"
                }}
            >
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <p className="text-sm font-medium">Initializing Map Engine...</p>
                    </div>
                ) : (
                    <div className="flex-1 w-full relative z-0">
                        <TicketHeatmap
                            points={validTickets.map((t) => ({
                                lat: (t as any).latitude,
                                lng: (t as any).longitude,
                                severity: t.severity,
                                title: t.title
                            }))}
                            height={800} // This gets overridden by the 100% height wrapper anyway
                        />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
