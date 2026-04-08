import * as React from "react";
import { cn } from "@/lib/utils";
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
    return (<textarea className={cn("flex min-h-[108px] w-full rounded-xl border border-input/90 bg-background px-4 py-3 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground/80 transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props}/>);
});
Textarea.displayName = "Textarea";
export { Textarea };
