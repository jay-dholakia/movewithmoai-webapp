import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to resolve email from username or email input
 * If input looks like an email (contains @), returns it as-is
 * Otherwise, queries the users table to find the email associated with the username
 */
export async function resolveEmailFromInput(
  input: string,
  supabase: any
): Promise<string | null> {
  // Check if input is an email (contains @)
  if (input.includes('@')) {
    return input
  }

  // Otherwise, treat as username and look up email
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('username', input)
    .single()

  if (error || !data) {
    return null
  }

  return data.email
}
