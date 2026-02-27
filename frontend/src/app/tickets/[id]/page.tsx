"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { tickets, ticketMessages, citizenUser } from "@/data/mockData";
import { StatusBadge, SeverityBadge, AiBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft, Send, Star, Clock, AlertTriangle, RefreshCw, ChevronUp, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const statusSteps = [
  { label: "Submitted", icon: "📋" },
  { label: "Under Review", icon: "🔍" },
  { label: "In Progress", icon: "🔧" },
  { label: "Resolved", icon: "✅" },
];

const TicketDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const ticket = tickets.find((t) => t.id === id);
  const messages = ticketMessages[id || ""] || [];
  const [newMessage, setNewMessage] = useState("");
  const [rating, setRating] = useState(ticket?.rating || 0);

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="outline" onClick={() => router.push("/tickets")} className="mt-4 rounded-xl">Back to Tickets</Button>
      </div>
    );
  }

  const statusIndex = ticket.status === "submitted" ? 0 : ticket.status === "in-progress" ? 2 : ticket.status === "resolved" ? 3 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push("/tickets")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <SeverityBadge severity={ticket.severity} />
            </div>
            <h1 className="text-lg font-display font-bold text-foreground">{ticket.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{ticket.location}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="flex items-center justify-between mt-6">
          {statusSteps.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${i <= statusIndex ? "bg-accent/15 border-2 border-accent" : "bg-secondary border-2 border-border"
                  }`}>
                  {i <= statusIndex ? s.icon : <span className="text-muted-foreground text-sm">{i + 1}</span>}
                </div>
                <span className={`text-[10px] mt-1 ${i <= statusIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${i < statusIndex ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI ETA */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Typically resolved in {ticket.estimatedDays} days</p>
          <p className="text-xs text-muted-foreground">Based on {ticket.similarCases} similar cases</p>
        </div>
        <AiBadge />
      </div>

      {/* Description */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Messages</h3>
          <div className="space-y-3 mb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "citizen" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === "citizen"
                  ? "bg-primary text-primary-foreground rounded-tr-md"
                  : "bg-secondary text-foreground rounded-tl-md"
                  }`}>
                  <p className="font-medium text-xs mb-1 opacity-75">{msg.senderName}</p>
                  <p>{msg.text}</p>
                  <p className="text-[10px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="rounded-xl min-h-[40px] text-sm" />
            <Button size="icon" className="rounded-xl bg-primary text-primary-foreground shrink-0 h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {ticket.status === "in-progress" && (
          <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <ChevronUp className="w-4 h-4" /> Escalate
          </Button>
        )}
        {ticket.status === "resolved" && (
          <Button variant="outline" className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Reopen
          </Button>
        )}
      </div>

      {/* Rating */}
      {ticket.status === "resolved" && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Rate Resolution</h3>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star className={`w-7 h-7 transition-colors ${star <= rating ? "text-accent fill-accent" : "text-border hover:text-accent/50"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Leave a comment about the resolution..." className="rounded-xl text-sm" />
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
