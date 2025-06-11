import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function addSign(value: string | number) {
  return typeof value === "number" ? (value > 0 ? "+" + value : value) : value;
}
