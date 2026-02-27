const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalyzeTicketRequest {
    ticket_id: string;
    description: string;
    image_url?: string;
}

export interface AnalyzeTicketResponse {
    ticket_id: string;
    issue_type: string;
    severity: string;
    department: string;
    ai_summary: string;
    priority_score: number;
}

export interface CopilotRequest {
    ticket_id: string;
    description: string;
    issue_type?: string;
    department?: string;
}

export interface CopilotResponse {
    recommended_action: string;
    effort_estimate: string;
    risk_level: string;
}

export interface CitizenAssistantRequest {
    ticket_id: string;
    description: string;
}

export interface CitizenAssistantResponse {
    response_text: string;
    confidence_score: number;
    requires_human: boolean;
}

export interface ValidateResolutionRequest {
    ticket_id: string;
    resolution_note: string;
    proof_url?: string;
}

export interface ValidateResolutionResponse {
    resolution_valid: boolean;
    reason: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function post<TReq, TRes>(
    path: string,
    body: TReq,
    token: string
): Promise<TRes> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Agent request failed");
    }
    return res.json() as Promise<TRes>;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/** Classify a newly created ticket: severity, department, AI summary, priority score. */
export function analyzeTicket(
    req: AnalyzeTicketRequest,
    token: string
): Promise<AnalyzeTicketResponse> {
    return post("/agents/analyze-ticket", req, token);
}

/**
 * Run the Agent Copilot for a ticket being worked on.
 * Returns recommended_action, effort_estimate, risk_level, and a reply_draft.
 */
export function runCopilot(
    req: CopilotRequest,
    token: string
): Promise<CopilotResponse> {
    return post("/agents/copilot", req, token);
}

/** Generate an automated citizen-facing response for a ticket. */
export function runCitizenAssistant(
    req: CitizenAssistantRequest,
    token: string
): Promise<CitizenAssistantResponse> {
    return post("/agents/citizen-assistant", req, token);
}

/** Validate a resolution note + proof URL before finalising the ticket. */
export function validateResolution(
    req: ValidateResolutionRequest,
    token: string
): Promise<ValidateResolutionResponse> {
    return post("/agents/validate-resolution", req, token);
}
