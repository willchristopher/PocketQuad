import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const inputVariants = cva("flex w-full rounded-[1.15rem] border text-sm text-foreground ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", {
    variants: {
        variant: {
            default: "border-input/90 bg-background shadow-sm",
            soft: "border-border/80 bg-card shadow-sm hover:border-primary/20 focus-visible:border-primary/30",
            subtle: "border-border/60 bg-muted hover:bg-muted/85",
        },
        inputSize: {
            default: "h-11 px-4 py-2.5",
            lg: "h-12 px-5 py-3 text-sm",
            xl: "h-14 px-5 py-3.5 text-base",
        },
    },
    defaultVariants: {
        variant: "default",
        inputSize: "default",
    },
});
const Input = React.forwardRef(({ className, type, variant, inputSize, ...props }, ref) => {
    return (<input type={type} className={cn(inputVariants({ variant, inputSize }), className)} ref={ref} {...props}/>);
});
Input.displayName = "Input";
export { Input, inputVariants };
