import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function capitalizeInitial(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return trimmed;
    }
    return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}
