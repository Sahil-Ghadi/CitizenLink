import { useState, useEffect, useCallback } from "react";
import { getIdToken } from "@/lib/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Canonical shape that matches what the backend returns ─────────────────────
// Field names are snake_case (as stored in Firestore / returned by FastAPI).
export interface ApiTicket {
    id: string;
    title: string;
    description: string;
    category: string;
    department: string;
    severity: "low" | "medium" | "high" | "emergency";
    status: "submitted" | "in-progress" | "resolved" | "auto-resolved" | "rejected";
    location_address: string;
    latitude?: number;
    longitude?: number;
    citizen_uid: string;
    citizen_name: string;
    citizen_email: string;
    citizen_verified?: boolean;
    photo_urls?: string[];
    created_at: string;
    updated_at: string;
    start_date?: string;
    ongoing?: boolean;
    additional_info?: string;
    priority_score: number;
    ai_summary?: string;
    copilot_recommended_action?: string;
    copilot_effort_estimate?: string;
    copilot_risk_level?: string;
    copilot_draft_reply?: string;
    copilot_run_at?: string;
    agent_uid?: string | null;
    agent_name?: string | null;
    messages?: unknown[];
    rating?: number | null;
}

interface UseTicketsReturn {
    tickets: ApiTicket[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

/**
 * Fetches all tickets from the backend (agent view).
 * Only works for authenticated users — the backend requires an Authorization header.
 */
export function useAgentTickets(): UseTicketsReturn {
    const [tickets, setTickets] = useState<ApiTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Not authenticated");
            const res = await fetch(`${BASE_URL}/tickets/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data: ApiTicket[] = await res.json();
            setTickets(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    return { tickets, loading, error, refresh: fetchTickets };
}

/**
 * Fetches a single ticket by ID (agent view).
 */
export function useTicketById(ticketId: string | null): {
    ticket: ApiTicket | null;
    loading: boolean;
    error: string | null;
} {
    const [ticket, setTicket] = useState<ApiTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ticketId) {
            setLoading(false);
            return;
        }
        const ticketRef = doc(db, "tickets", ticketId);
        const unsubscribe = onSnapshot(ticketRef, (docSnap) => {
            if (docSnap.exists()) {
                setTicket({ id: docSnap.id, ...docSnap.data() } as ApiTicket);
            } else {
                setError("Ticket not found");
            }
            setLoading(false);
        }, (err) => {
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [ticketId]);

    return { ticket, loading, error };
}
