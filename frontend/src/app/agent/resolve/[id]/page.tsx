"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { tickets } from "@/data/mockData";
import { ArrowLeft, Upload, CheckCircle, Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/shared/StatusBadge";

const resolutionTypes = ["Repair Completed", "Issue Redirected", "No Action Needed", "Duplicate Closed"];
const qualityChecklist = [
  "Resolution note describes action taken",
  "Proof/evidence uploaded",
  "Citizen was informed of resolution",
  "Resolution type selected",
];

const ResolveTicket = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const ticket = tickets.find((t) => t.id === id);
  const [note, setNote] = useState("");
  const [resType, setResType] = useState("");
  const [checks, setChecks] = useState<boolean[]>(qualityChecklist.map(() => false));
  const [resolved, setResolved] = useState(false);

  const toggleCheck = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
  };

  const allChecked = checks.every(Boolean);

  if (!ticket) return null;

  if (resolved) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mt-12 text-center">
        <div className="glass-card-elevated p-8">
          <div className="w-16 h-16 rounded-full bg-status-resolved/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-status-resolved" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Ticket Resolved</h2>
          <p className="text-sm text-muted-foreground mt-2">{ticket.id} has been marked as resolved</p>
          <div className="glass-card p-3 mt-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">SMS Preview</span>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary p-3 rounded-xl">
              "Dear {ticket.citizenName}, your complaint {ticket.id} has been resolved. If unsatisfied, you can reopen within 7 days. — CitizenPortal"
            </p>
          </div>
          <Button className="mt-6 rounded-xl bg-primary text-primary-foreground w-full" onClick={() => router.push("/agent/queue")}>
            Back to Queue
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Resolve Ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">{ticket.id} — {ticket.title}</p>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Resolution Note</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe the resolution..." className="rounded-xl min-h-[100px]" />
        </div>

        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Proof Upload</label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent transition-colors cursor-pointer">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Upload photo, document, or reference</p>
          </div>
        </div>

        <div className="glass-card p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Resolution Type</label>
          <div className="grid grid-cols-2 gap-2">
            {resolutionTypes.map((rt) => (
              <button
                key={rt}
                onClick={() => setResType(rt)}
                className={`p-3 rounded-xl text-sm text-left border transition-all ${resType === rt ? "border-accent bg-accent/5 text-foreground font-medium" : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-accent">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-foreground">Resolution Quality Check</span>
            <AiBadge />
          </div>
          <div className="space-y-2">
            {qualityChecklist.map((item, i) => (
              <button key={item} onClick={() => toggleCheck(i)} className="flex items-center gap-3 w-full text-left">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checks[i] ? "bg-status-resolved border-status-resolved" : "border-border"
                  }`}>
                  {checks[i] && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={`text-sm ${checks[i] ? "text-foreground" : "text-muted-foreground"}`}>{item}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setResolved(true)}
          disabled={!allChecked}
          className={`w-full h-12 rounded-xl font-semibold ${allChecked ? "bg-status-resolved text-primary-foreground hover:bg-status-resolved/90" : "bg-muted text-muted-foreground"}`}
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Mark as Resolved
        </Button>
      </div>
    </div>
  );
};

export default ResolveTicket;
