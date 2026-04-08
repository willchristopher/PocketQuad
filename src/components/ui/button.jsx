import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:brightness-95", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow-sm hover:shadow-md",
            gradient: "bg-primary text-primary-foreground shadow-sm hover:shadow-md",
            destructive: "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md",
            outline: "border border-input/80 bg-card text-foreground shadow-sm hover:bg-muted hover:shadow-md",
            secondary: "bg-secondary text-secondary-foreground shadow-sm hover:shadow-md",
            surface: "border border-border/70 bg-card text-foreground shadow-sm hover:bg-muted hover:shadow-md",
            ghost: "hover:bg-muted hover:text-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
            default: "h-11 px-4 py-2.5",
            sm: "h-9 rounded-lg px-3.5",
            lg: "h-12 px-8",
            xl: "h-14 px-6 text-sm uppercase tracking-[0.12em]",
            icon: "h-11 w-11",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (<Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}/>);
});
Button.displayName = "Button";
export { Button, buttonVariants };
