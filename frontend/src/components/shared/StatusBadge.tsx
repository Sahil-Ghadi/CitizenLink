import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "status-submitted" },
  "in-progress": { label: "In Progress", className: "status-progress" },
  resolved: { label: "Resolved", className: "status-resolved" },
  "auto-resolved": { label: "Resolved", className: "status-resolved" },
  emergency: { label: "Emergency", className: "status-emergency" },
  rejected: { label: "Rejected", className: "status-submitted" },
};

const severityConfig = {
  emergency: { label: "Emergency", className: "severity-emergency" },
  high: { label: "High", className: "severity-high" },
  medium: { label: "Medium", className: "severity-medium" },
  low: { label: "Low", className: "severity-low" },
};

export const StatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
  const c = statusConfig[status];
  return <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-semibold", c.className)}>{c.label}</span>;
};

export const SeverityBadge = ({ severity }: { severity: keyof typeof severityConfig }) => {
  const c = severityConfig[severity];
  return <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-semibold", c.className)}>{c.label}</span>;
};

export const AiBadge = () => (
  <span className="ai-badge">
    <span>🤖</span>
    <span>AI</span>
  </span>
);

export const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-status-resolved/15 text-status-resolved border border-status-resolved/25">
    ✓ Verified
  </span>
);
