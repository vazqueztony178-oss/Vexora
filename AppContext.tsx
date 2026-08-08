/**
 * Password hashing helpers.
 *
 * Passwords are never stored as typed. Each account gets a random salt and we
 * store a salted SHA-256 digest instead, so the stored record cannot be read
 * back as a usable credential.
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** A fresh, unguessable salt for a new account. */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** A fresh, unguessable random string, used for demo-account placeholders. */
export function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** Salted SHA-256 of a password, hex encoded. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

/**
 * Constant-time-ish comparison of two hex digests. Both values are the same
 * fixed length, so this simply avoids an early-exit compare.
 */
export function digestsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
