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
export function formatEnumLabel(value) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
        return "";
    }
    return normalized
        .toLowerCase()
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => capitalizeInitial(part))
        .join(" ");
}
export function formatDateTimeLocalInput(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
export function toAbsoluteDateTime(value) {
    if (!value) {
        return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date.toISOString();
}
