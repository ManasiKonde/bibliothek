/**
 * Email validation for login/signup: stricter than a minimal regex.
 * - One @, non-empty local and domain, no spaces
 * - Local: letters, digits, . _ - + (no leading/trailing dot, no consecutive dots)
 * - Domain: at least one dot, TLD 2+ chars
 * - Length within RFC max (254)
 */
const MAX_EMAIL_LENGTH = 254;

// Local: one alphanumeric, then optional * (alphanumeric or . _ -), then optional trailing alphanumeric. Domain: label(s).tld (tld 2+ chars)
const EMAIL_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const s = email.trim().toLowerCase();
  if (!s || s.length > MAX_EMAIL_LENGTH) return false;
  if (s.includes("..") || s.startsWith(".") || s.endsWith(".")) return false;
  if (s.indexOf("@") <= 0 || s.indexOf("@") !== s.lastIndexOf("@")) return false;
  const domain = s.slice(s.indexOf("@") + 1);
  if (!domain || domain.indexOf(".") === -1 || domain.length < 4) return false;
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return false;
  return EMAIL_REGEX.test(s);
}
