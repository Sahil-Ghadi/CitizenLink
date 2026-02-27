"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { notifications } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  const typeIcon = { update: "📝", resolved: "✅", alert: "🚨", info: "ℹ️" };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer ${!n.read ? "bg-accent/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">{typeIcon[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
};

