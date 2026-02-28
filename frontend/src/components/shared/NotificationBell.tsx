"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, CheckCircle2, Sparkles, User2, AlertTriangle, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppContext } from "@/context/AppContext";

interface Notif {
  id: string;
  icon: "resolved" | "ai" | "agent" | "review" | "info";
  title: string;
  body: string;
  time: Date;
  read: boolean;
}

const ICONS = {
  resolved: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  ai: <Sparkles className="w-4 h-4 text-accent" />,
  agent: <User2 className="w-4 h-4 text-blue-400" />,
  review: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-muted-foreground" />,
};

function timeLabel(d: Date) {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const prevStateRef = useRef<Record<string, { status: string; agent_name?: string }>>({});
  const initializedRef = useRef(false);
  const { user } = useAppContext();

  const push = useCallback((n: Omit<Notif, "id" | "time" | "read">) => {
    setNotifs((prev) => [
      { ...n, id: `${Date.now()}-${Math.random()}`, time: new Date(), read: false },
      ...prev.slice(0, 19), // keep last 20
    ]);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tickets"), where("citizen_uid", "==", user.uid));

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as { status: string; agent_name?: string; title?: string }),
      }));

      if (!initializedRef.current) {
        docs.forEach((doc) => {
          prevStateRef.current[doc.id] = { status: doc.status, agent_name: doc.agent_name };
        });
        initializedRef.current = true;
        return;
      }

      docs.forEach((doc) => {
        const prev = prevStateRef.current[doc.id];
        const label = doc.title ? `"${doc.title}"` : "Your ticket";

        if (!prev) {
          prevStateRef.current[doc.id] = { status: doc.status, agent_name: doc.agent_name };
          return;
        }

        if (prev.status !== doc.status) {
          if (doc.status === "resolved") {
            push({ icon: "resolved", title: "Ticket Resolved", body: `${label} has been resolved.` });
          } else if (doc.status === "auto-resolved") {
            push({ icon: "ai", title: "Resolved by AI", body: `${label} was auto-answered by CitizenLink AI.` });
          } else if (doc.status === "in-progress") {
            push({ icon: "review", title: "Under Review", body: `${label} is being reviewed by our team.` });
          }
        } else if (doc.agent_name && prev.agent_name !== doc.agent_name) {
          push({ icon: "agent", title: "Agent Assigned", body: `${doc.agent_name} is now handling ${label}.` });
        }

        prevStateRef.current[doc.id] = { status: doc.status, agent_name: doc.agent_name };
      });
    });

    return () => unsub();
  }, [user, push]);

  const unread = notifs.filter((n) => !n.read).length;
  const markAllRead = () => setNotifs((p) => p.map((n) => ({ ...n, read: true })));

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-accent hover:underline">Mark all read</button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifs.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors ${!n.read ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{ICONS[n.icon]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeLabel(n.time)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
