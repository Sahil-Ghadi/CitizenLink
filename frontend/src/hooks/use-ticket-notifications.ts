"use client";
import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";

// Maps a raw Firestore status to a human-friendly notification message
const STATUS_MESSAGES: Record<string, { title: string; description: string; variant?: "default" | "destructive" }> = {
    "in-progress": {
        title: "Ticket Under Review",
        description: "Your complaint is being reviewed by our team.",
    },
    resolved: {
        title: "✅ Ticket Resolved!",
        description: "Your complaint has been resolved by an agent.",
    },
    "auto-resolved": {
        title: "✨ Resolved by AI",
        description: "CitizenLink AI automatically answered your complaint.",
    },
    submitted: {
        title: "Ticket Submitted",
        description: "Your complaint has been received.",
    },
};

// Specifically detect when an agent is newly assigned
function agentAssignedMessage(agentName: string) {
    return {
        title: "👤 Agent Assigned",
        description: `${agentName} has been assigned to your complaint.`,
    };
}

/**
 * Mounts a Firestore real-time listener for the current user's tickets.
 * On first mount, snapshots the current statuses silently (no toasts).
 * Every subsequent change fires a toast matching the new status.
 */
export function useTicketNotifications() {
    const { user } = useAppContext();
    // Store snapshot of {ticketId → { status, agent_name }} so we can detect changes
    const prevStateRef = useRef<Record<string, { status: string; agent_name?: string }>>({});
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, "tickets"), where("citizen_uid", "==", user.uid));

        const unsub = onSnapshot(q, (snap) => {
            const currentDocs = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as { status: string; agent_name?: string; title?: string }),
            }));

            if (!initializedRef.current) {
                // First load — just record current state, no toasts
                currentDocs.forEach((doc) => {
                    prevStateRef.current[doc.id] = {
                        status: doc.status,
                        agent_name: doc.agent_name,
                    };
                });
                initializedRef.current = true;
                return;
            }

            // Compare each ticket against previous state
            currentDocs.forEach((doc) => {
                const prev = prevStateRef.current[doc.id];
                const ticketTitle = doc.title ? `"${doc.title}"` : "Your ticket";

                if (!prev) {
                    // Brand new ticket — record it silently (submitted toast is already handled on submit)
                    prevStateRef.current[doc.id] = { status: doc.status, agent_name: doc.agent_name };
                    return;
                }

                const statusChanged = prev.status !== doc.status;
                const agentChanged = doc.agent_name && prev.agent_name !== doc.agent_name;

                if (statusChanged && STATUS_MESSAGES[doc.status]) {
                    const msg = STATUS_MESSAGES[doc.status];
                    toast({
                        title: msg.title,
                        description: `${ticketTitle} — ${msg.description}`,
                        variant: msg.variant,
                    });
                } else if (agentChanged && !statusChanged) {
                    // Status stayed in-progress but agent was newly assigned
                    const msg = agentAssignedMessage(doc.agent_name!);
                    toast({
                        title: msg.title,
                        description: `${ticketTitle} — ${msg.description}`,
                    });
                }

                // Update tracked state
                prevStateRef.current[doc.id] = { status: doc.status, agent_name: doc.agent_name };
            });
        });

        return () => unsub();
    }, [user]);
}
