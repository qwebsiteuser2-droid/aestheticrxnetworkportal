import { AppDataSource } from '../db/data-source';

/**
 * Email Quota Service
 * 
 * Tracks daily email sending to prevent exceeding Gmail limits
 * - Free Gmail: 500 emails/day
 * - Google Workspace: 2000 emails/day
 * 
 * For 1000 users over 3 years:
 * - OTP emails: ~1-2 per user/month = ~26-53 emails/day average
 * - Marketing: ~1-2 per month = ~26-53 emails/day average
 * - Transactional: ~5-10 per user/year = ~14-27 emails/day average
 * 
 * Total: ~66-133 emails/day average (well within 500/day limit!)
 */

interface DailyEmailCount {
  date: string; // YYYY-MM-DD format
  count: number;
  resetTime: number; // Timestamp when count resets
}

// In-memory storage for daily email counts
// In production, consider using Redis or database for persistence
const dailyEmailCounts = new Map<string, DailyEmailCount>();

// Gmail daily limits
const GMAIL_FREE_LIMIT = 500; // Free Gmail account
const GMAIL_WORKSPACE_LIMIT = 2000; // Google Workspace account

/**
 * Get Gmail daily limit based on account type
 */
function getGmailDailyLimit(): number {
  // Check if using Google Workspace (custom domain) or free Gmail
  const gmailUser = process.env.GMAIL_USER || '';
  const isWorkspace = gmailUser.includes('@') && !gmailUser.endsWith('@gmail.com');
  
  // Allow override via environment variable
  const customLimit = process.env.GMAIL_DAILY_LIMIT;
  if (customLimit) {
    return parseInt(customLimit, 10);
  }
  
  return isWorkspace ? GMAIL_WORKSPACE_LIMIT : GMAIL_FREE_LIMIT;
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get or initialize today's email count
 */
function getTodayEmailCount(): DailyEmailCount {
  const today = getTodayDateString();
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const resetTime = tomorrow.getTime();

  const existing = dailyEmailCounts.get(today);
  if (existing && now < existing.resetTime) {
    return existing;
  }

  // Reset for new day or initialize
  const newCount: DailyEmailCount = {
    date: today,
    count: 0,
    resetTime: resetTime
  };

  dailyEmailCounts.set(today, newCount);
  
  // Clean up old entries (keep last 7 days)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  for (const [date, count] of dailyEmailCounts.entries()) {
    if (count.resetTime < sevenDaysAgo) {
      dailyEmailCounts.delete(date);
    }
  }

  return newCount;
}

/**
 * Increment daily email count
 */
export function incrementEmailCount(): number {
  const todayCount = getTodayEmailCount();
  todayCount.count++;
  dailyEmailCounts.set(todayCount.date, todayCount);
  return todayCount.count;
}

/**
 * Get current daily email count
 */
export function getCurrentEmailCount(): number {
  const todayCount = getTodayEmailCount();
  return todayCount.count;
}

/**
 * Check if we can send more emails today
 */
export function canSendEmail(): { canSend: boolean; remaining: number; limit: number; percentage: number } {
  const limit = getGmailDailyLimit();
  const current = getCurrentEmailCount();
  const remaining = Math.max(0, limit - current);
  const percentage = (current / limit) * 100;

  return {
    canSend: current < limit,
    remaining,
    limit,
    percentage
  };
}

/**
 * Get email quota status with warnings
 */
export function getEmailQuotaStatus(): {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  message: string;
} {
  const limit = getGmailDailyLimit();
  const current = getCurrentEmailCount();
  const remaining = Math.max(0, limit - current);
  const percentage = (current / limit) * 100;

  let status: 'safe' | 'warning' | 'critical' | 'exceeded';
  let message: string;

  if (current >= limit) {
    status = 'exceeded';
    message = `⚠️ Gmail daily limit exceeded! (${current}/${limit} emails sent today). No more emails can be sent until tomorrow.`;
  } else if (percentage >= 90) {
    status = 'critical';
    message = `🚨 CRITICAL: Approaching Gmail daily limit! (${current}/${limit} emails, ${remaining} remaining). Consider postponing non-urgent emails.`;
  } else if (percentage >= 80) {
    status = 'warning';
    message = `⚠️ WARNING: Approaching Gmail daily limit (${current}/${limit} emails, ${remaining} remaining). Monitor email sending.`;
  } else {
    status = 'safe';
    message = `✅ Email quota healthy (${current}/${limit} emails sent today, ${remaining} remaining)`;
  }

  return {
    current,
    limit,
    remaining,
    percentage,
    status,
    message
  };
}

/**
 * Log email quota status (for monitoring)
 */
export function logEmailQuotaStatus(): void {
  const status = getEmailQuotaStatus();
  if (status.status === 'exceeded' || status.status === 'critical') {
    console.error(`📧 ${status.message}`);
  } else if (status.status === 'warning') {
    console.warn(`📧 ${status.message}`);
  } else {
    console.log(`📧 ${status.message}`);
  }
}

/**
 * Check if email can be sent and log warning if approaching limit
 */
export function checkEmailQuotaBeforeSend(): boolean {
  const quota = canSendEmail();
  
  if (!quota.canSend) {
    console.error(`❌ Cannot send email: Gmail daily limit exceeded (${quota.limit} emails/day)`);
    return false;
  }

  // Log warning if approaching limit
  if (quota.percentage >= 80) {
    logEmailQuotaStatus();
  }

  return true;
}

