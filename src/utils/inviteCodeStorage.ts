import { supabase } from '@/integrations/supabase/client';

/**
 * Standardized invite code data structure
 */
export interface PendingInviteCode {
  code: string;              // "FP-XXXXX"
  code_type: string;         // "founder" | "referral"
  invite_code_id: string;    // UUID
  stored_at: number;         // timestamp for debugging
}

const STORAGE_KEY = 'pending_invite_code';

/**
 * Check if a string is valid JSON
 */
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and enrich a plain invite code by calling the API
 */
async function enrichPlainCode(code: string): Promise<PendingInviteCode | null> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-invite-code', {
      body: { code }
    });

    if (error || !data?.valid) {
      console.warn('Failed to enrich plain invite code:', code, error);
      return null;
    }

    return {
      code: data.code,
      code_type: data.code_type,
      invite_code_id: data.invite_code_id,
      stored_at: Date.now()
    };
  } catch (error) {
    console.error('Error enriching invite code:', error);
    return null;
  }
}

/**
 * Parse invite code from localStorage value
 * Auto-detects format (JSON or plain string) and migrates if needed
 *
 * @param rawValue - Raw value from localStorage
 * @returns Parsed invite code or null if invalid
 */
export async function parseInviteCode(rawValue: string | null): Promise<PendingInviteCode | null> {
  if (!rawValue) {
    return null;
  }

  // Try parsing as JSON first
  if (isValidJSON(rawValue)) {
    try {
      const parsed = JSON.parse(rawValue);

      // Validate structure
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.code === 'string' &&
        typeof parsed.code_type === 'string' &&
        typeof parsed.invite_code_id === 'string'
      ) {
        // Add stored_at if missing (for backward compatibility)
        if (!parsed.stored_at) {
          parsed.stored_at = Date.now();
        }
        return parsed as PendingInviteCode;
      }
    } catch (error) {
      console.warn('Failed to parse invite code JSON:', error);
      return null;
    }
  }

  // If not JSON, treat as plain string and enrich it
  // This handles backward compatibility with old format
  console.log('Detected plain string invite code, enriching:', rawValue);
  const enriched = await enrichPlainCode(rawValue);

  if (enriched) {
    // Store the enriched version for next time
    storeInviteCode(enriched);
  }

  return enriched;
}

/**
 * Store invite code in localStorage as JSON
 *
 * @param details - Invite code details to store
 */
export function storeInviteCode(details: PendingInviteCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
  } catch (error) {
    console.error('Failed to store invite code:', error);
  }
}

/**
 * Get invite code from localStorage with auto-migration
 *
 * @returns Invite code details or null if not found/invalid
 */
export async function getInviteCode(): Promise<PendingInviteCode | null> {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    return await parseInviteCode(rawValue);
  } catch (error) {
    console.error('Failed to get invite code:', error);
    return null;
  }
}

/**
 * Clear invite code from localStorage
 */
export function clearInviteCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear invite code:', error);
  }
}

/**
 * Synchronously get the raw invite code string (for display purposes only)
 * Does NOT validate or migrate the code
 *
 * @returns Code string or null
 */
export function getInviteCodeSync(): string | null {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return null;

    // Try parsing as JSON
    if (isValidJSON(rawValue)) {
      const parsed = JSON.parse(rawValue);
      return parsed?.code || null;
    }

    // Return plain string as-is
    return rawValue;
  } catch {
    return null;
  }
}
