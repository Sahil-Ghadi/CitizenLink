"use client";
import { motion } from "framer-motion";
import { tickets, citizenUser } from "@/data/mockData";
import { StatusBadge, SeverityBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import { Clock, Star } from "lucide-react";

const MyTickets = () => {
  const navigate = useRouter();
  const myTickets = tickets.filter((t) => t.citizenName === citizenUser.fullName);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">{myTickets.length} complaints filed</p>
      </div>

      <div className="space-y-3">
        {myTickets.map((ticket, i) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(`/tickets/${ticket.id}`)}
            className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                  <StatusBadge status={ticket.status} />
                  <SeverityBadge severity={ticket.severity} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{ticket.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ticket.department} • {ticket.location}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
                {ticket.rating && (
                  <div className="flex items-center gap-0.5 justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < ticket.rating! ? "text-accent fill-accent" : "text-border"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MyTickets;

