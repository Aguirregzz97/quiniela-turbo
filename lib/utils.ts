import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a short, unique join code for quinielas
 * Format: 6 characters, alphanumeric, uppercase
 * Examples: ABC123, XYZ789, DEF456
 */
export function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  // Generate 6 characters
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Validates if a join code has the correct format
 * Must be exactly 6 characters, alphanumeric, uppercase
 */
export function isValidJoinCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
