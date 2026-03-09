import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeInitial(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return trimmed
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}
