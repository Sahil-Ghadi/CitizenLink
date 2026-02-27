"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { tickets, ticketMessages } from "@/data/mockData";
import { StatusBadge, SeverityBadge, AiBadge, VerifiedBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft, Send, MapPin, CheckCircle, RefreshCw, GitMerge, MessageSquare,
  XCircle, Sparkles, AlertTriangle, Clock, ChevronDown, ChevronUp, Zap, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AgentTicketDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const ticket = tickets.find((t) => t.id === id);
  const messages = ticketMessages[id || ""] || [];
  const [aiSummaryOpen, setAiSummaryOpen] = useState(true);
  const [draftResponse, setDraftResponse] = useState(
    ticket ? `Dear ${ticket.citizenName}, \n\nThank you for reporting this issue.We have reviewed your complaint and our team is now working on it.You can expect resolution within ${ticket.estimatedDays} days.\n\nBest regards, \nPublic Works Department` : ""
  );

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="outline" onClick={() => router.push("/agent/queue")} className="mt-4 rounded-xl">Back to Queue</Button>
      </div>
    );
  }

  const similarCases = [
    { id: "PS-2025-00712", title: "Water main leak on Hill Road", resolution: "Pipe replacement", time: "18 hours" },
    { id: "PS-2025-00689", title: "Burst pipe near market area", resolution: "Emergency welding", time: "6 hours" },
    { id: "PS-2025-00654", title: "Water seepage from underground", resolution: "Full section repair", time: "3 days" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => router.push("/agent/queue")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <SeverityBadge severity={ticket.severity} />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">Score: {ticket.priorityScore}</span>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">{ticket.title}</h1>
        </div>
      </div>

      {/* Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Description */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Citizen Report</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
          </div>

          {/* Location */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</h3>
            <p className="text-sm text-muted-foreground">{ticket.location}</p>
            <div className="mt-3 w-full h-32 rounded-xl bg-secondary flex items-center justify-center border border-border">
              <MapPin className="w-6 h-6 text-accent" />
            </div>
          </div>

          {/* Citizen Profile */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Citizen Profile</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                {ticket.citizenName.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">{ticket.citizenName} {ticket.citizenVerified && <VerifiedBadge />}</p>
                <p className="text-xs text-muted-foreground">3 past complaints • 4.2 avg rating</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Communication History</h3>
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{msg.senderName}</span>
                      <span className={`text - [10px] px - 1.5 py - 0.5 rounded - full ${msg.sender === "agent" ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-muted-foreground"} `}>
                        {msg.sender}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - AI Assistant */}
        <div className="space-y-4">
          {/* AI Summary */}
          <div className="glass-card p-4 border-l-4 border-l-accent">
            <button onClick={() => setAiSummaryOpen(!aiSummaryOpen)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">AI Summary</span>
                <AiBadge />
              </div>
              {aiSummaryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {aiSummaryOpen && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-muted-foreground mt-2">
                {ticket.aiSummary}
              </motion.p>
            )}
          </div>

          {/* Recommended Action */}
          <div className="glass-card p-4 bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Recommended Action</span>
              <AiBadge />
            </div>
            <p className="text-sm text-muted-foreground">{ticket.recommendedAction}</p>
          </div>

          {/* Effort Estimate */}
          <div className="glass-card p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Effort Estimate: <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground text-xs font-bold">
                {ticket.priorityScore > 80 ? "High" : ticket.priorityScore > 50 ? "Medium" : "Low"}
              </span></p>
              <p className="text-xs text-muted-foreground">Est. {ticket.estimatedDays} day(s) to resolve</p>
            </div>
            <AiBadge />
          </div>

          {/* Sentiment */}
          {ticket.severity === "emergency" && (
            <div className="glass-card p-4 border-l-4 border-l-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-foreground">Sentiment Flag</span>
                <AiBadge />
              </div>
              <p className="text-sm text-muted-foreground mt-1">⚠️ Citizen tone is urgent. Use empathetic language.</p>
            </div>
          )}

          {/* Similar Cases */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Similar Past Cases</span>
              <AiBadge />
            </div>
            <div className="space-y-2">
              {similarCases.map((c) => (
                <div key={c.id} className="p-3 bg-secondary/50 rounded-xl">
                  <p className="text-xs font-mono text-muted-foreground">{c.id}</p>
                  <p className="text-sm text-foreground font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Resolution: {c.resolution} • {c.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-drafted Response */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Draft Response</span>
              <AiBadge />
            </div>
            <Textarea
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              className="rounded-xl min-h-[120px] text-sm mb-3"
            />
            <Button className="w-full rounded-xl bg-primary text-primary-foreground gap-2">
              <Send className="w-4 h-4" /> Send to Citizen
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl bg-status-resolved text-primary-foreground gap-2 hover:bg-status-resolved/90">
            <CheckCircle className="w-4 h-4" /> Accept & Start
          </Button>
          <Button variant="outline" className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Reassign
          </Button>
          <Button variant="outline" className="rounded-xl gap-2">
            <GitMerge className="w-4 h-4" /> Merge
          </Button>
          <Button variant="outline" className="rounded-xl gap-2">
            <MessageSquare className="w-4 h-4" /> Request Info
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => router.push(`/agent/resolve/${ticket.id}`)}>
            <CheckCircle className="w-4 h-4" /> Resolve
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentTicketDetail;
