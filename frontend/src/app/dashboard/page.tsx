"use client";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Droplets, CloudRain, ArrowRight, FileText } from "lucide-react";
import { tickets, citizenUser } from "@/data/mockData";
import { StatusBadge, SeverityBadge, AiBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const CitizenDashboard = () => {
  const router = useRouter();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const activeTickets = tickets.filter((t) => t.status !== "resolved" && t.citizenName === citizenUser.fullName);
  const citizenTickets = tickets.filter((t) => t.citizenName === citizenUser.fullName);

  const stats = [
    { label: "Total Reported", value: citizenUser.totalReported, icon: FileText, color: "text-foreground" },
    { label: "Active", value: citizenUser.active, icon: Clock, color: "text-status-progress" },
    { label: "Resolved", value: citizenUser.resolved, icon: CheckCircle, color: "text-status-resolved" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          {greeting}, {citizenUser.name} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your civic issues</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <span className="text-3xl font-bold text-foreground font-display">{s.value}</span>
          </div>
        ))}
      </motion.div>

      {/* AI Cards Row */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Area Pulse */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-status-submitted" />
            <span className="text-sm font-semibold text-foreground">Area Pulse</span>
            <AiBadge />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">18 people</span> near you reported water supply issues this week
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-status-progress" />
            <span>12% increase from last week</span>
          </div>
        </div>

        {/* Seasonal Prompt */}
        <div className="glass-card p-5 border-l-4 border-l-accent">
          <div className="flex items-center gap-2 mb-3">
            <CloudRain className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Smart Seasonal Prompt</span>
            <AiBadge />
          </div>
          <p className="text-sm text-muted-foreground">
            Monsoon season: flooding common near you. Report quickly for faster response.
          </p>
          <button
            onClick={() => router.push("/report")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            Report Now <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      {/* Active Complaints */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Active Complaints</h2>
          <button onClick={() => router.push("/tickets")} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {citizenTickets.filter(t => t.status !== 'resolved').map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <SeverityBadge severity={ticket.severity} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{ticket.department} • {ticket.location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(ticket.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CitizenDashboard;

