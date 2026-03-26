/**
 * Email validation utility
 * Validates email addresses before sending to prevent bounces and improve deliverability
 */

/**
 * Validates email address format using RFC 5322 compliant regex
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedEmail = email.trim();

  // Basic length check
  if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
    return false;
  }

  // RFC 5322 compliant regex (simplified but covers most cases)
  // This regex checks for:
  // - Local part (before @): 1-64 characters, allows letters, numbers, dots, hyphens, underscores, plus signs
  // - @ symbol
  // - Domain part (after @): allows letters, numbers, dots, hyphens
  // - TLD: at least 2 characters
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }

  // Additional checks
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const localPart = parts[0];
  const domain = parts[1];

  // Type guard: ensure both parts exist
  if (!localPart || !domain) {
    return false;
  }

  // Local part validation (1-64 characters)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Domain validation
  if (domain.length === 0 || domain.length > 253) {
    return false;
  }

  // Check for consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return false;
  }

  // Check for leading/trailing dots
  if (localPart.startsWith('.') || localPart.endsWith('.') || 
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  // Domain must have at least one dot (for TLD)
  if (!domain.includes('.')) {
    return false;
  }

  // TLD must be at least 2 characters
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return false;
  }

  return true;
}

/**
 * Validates an array of email addresses
 * @param emails - Array of email addresses to validate
 * @returns Object with valid and invalid email arrays
 */
export function validateEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email.trim());
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

/**
 * Filters out invalid email addresses from an array
 * @param emails - Array of email addresses to filter
 * @returns Array of valid email addresses
 */
export function filterValidEmails(emails: string[]): string[] {
  return emails.filter(email => isValidEmail(email));
}

