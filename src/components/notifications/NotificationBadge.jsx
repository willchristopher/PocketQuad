'use client';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
export function NotificationBadge({ count = 0, className }) {
    return (<AnimatePresence>
      {count > 0 && (<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={cn("flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground", className)}>
          {count > 99 ? '99+' : count}
        </motion.span>)}
    </AnimatePresence>);
}
