/**
 * URL sanitizing for user-supplied links.
 *
 * A profile field is written by one person and rendered to everyone else, so it
 * is untrusted input. Putting it straight into an `href` allows `javascript:`
 * and `data:` URLs, which run in the viewer's session.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns the URL only when it is a plain web address, otherwise null.
 * A bare value like "example.com" is upgraded to https rather than rejected.
 */
export function safeExternalUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return null;
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}
